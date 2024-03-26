FROM rust:1.77-bookworm AS builder
WORKDIR /build
COPY . .
RUN cargo build --release

FROM debian:bookworm
WORKDIR /app
COPY --from=builder /build/target/release/backend .
EXPOSE 3000/tcp
CMD [ "/app/backend" ]
