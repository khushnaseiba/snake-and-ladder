# Snake and Ladder

A small Snake and Ladder game.

- 1 to 4 players.
- Roll the dice and move forward.
- First player to reach 100 wins.
- There are ladders & snakes (of course XD).

## Requirements

- Rust stable
- The WebAssembly target: `rustup target add wasm32-unknown-unknown`
- `wasm-bindgen-cli`: `cargo install wasm-bindgen-cli`

## Build and run

```
./build.sh
python3 -m http.server -d web 8000
```

and open http://localhost:8000.
