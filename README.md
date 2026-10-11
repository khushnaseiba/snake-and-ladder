# Snake and Ladder

play it [here](https://khushnaseiba.github.io/snake-and-ladder/)

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
wasm-pack build -t web --out-dir web/pkg
python3 -m http.server -d web 8000
```

and open [http://localhost:8000](http://localhost:8000).
