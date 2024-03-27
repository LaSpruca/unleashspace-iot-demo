use axum::{
    http::Method,
    response::sse::{Event, KeepAlive, Sse},
    routing::get,
    Router,
};
use chrono::{Local, Utc};
use futures_util::stream::Stream;
use rand::{thread_rng, Rng};
use std::{convert::Infallible, time::Duration};
use tokio::{sync::mpsc::channel, time::sleep};
use tokio_stream::wrappers::ReceiverStream;
use tower_http::{
    cors::CorsLayer,
    trace::{self, TraceLayer},
};
use tracing::Level;

#[tokio::main]
async fn main() {
    match std::env::var("RUST_LOG") {
        Err(_) => {
            std::env::set_var("RUST_LOG", "info");
        }
        Ok(_) => {}
    }
    tracing_subscriber::fmt::init();

    let app = Router::new()
        .route("/download", get(download_test))
        .layer(
            CorsLayer::new()
                .allow_origin([
                    "http://localhost:5173".parse().unwrap(),
                    "https://unleashspace-iot-demo.vercel.app".parse().unwrap(),
                ])
                .allow_methods(Method::GET),
        )
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(trace::DefaultMakeSpan::new().level(Level::INFO))
                .on_response(trace::DefaultOnResponse::new().level(Level::INFO)),
        );

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn gen_bytes() -> String {
    let mut rng = thread_rng();
    let mut data = vec![0; 10_000];
    data.fill_with(move || rng.gen_range(65..=122 as u8));
    unsafe { return String::from_utf8_unchecked(data) }
}

async fn download_test() -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let (tx, rx) = channel(5);

    tokio::spawn(async move {
        for _ in 0..50 {
            let data = gen_bytes();
            let now = Local::now().with_timezone(&Utc);
            let payload = format!("{{ \"time\": {} }}#{}", now.timestamp_millis(), data);

            tx.send(Ok(Event::default().data(payload)))
                .await
                .expect("Could not send done");

            sleep(Duration::from_millis(100)).await;
        }

        tx.send(Ok(Event::default().data("done".to_string())))
            .await
            .expect("Could not send done");
    });

    Sse::new(ReceiverStream::new(rx)).keep_alive(KeepAlive::default())
}
