use wasm_bindgen::prelude::*;

const BOARD_SIZE: i32 = 100;
const MAX_PLAYERS: usize = 4;

const SNAKES: &[(i32, i32)] = &[
    (17, 7),
    (54, 34),
    (62, 19),
    (64, 60),
    (87, 24),
    (93, 73),
    (95, 75),
    (99, 78),
];

const LADDERS: &[(i32, i32)] = &[
    (4, 14),
    (9, 31),
    (20, 38),
    (28, 84),
    (40, 59),
    (51, 67),
    (63, 81),
    (71, 91),
];

fn lookup(pairs: &[(i32, i32)], from: i32) -> i32 {
    for &(start, end) in pairs {
        if start == from {
            return end;
        }
    }
    0
}

#[wasm_bindgen]
pub fn snake_tail(head: i32) -> i32 {
    lookup(&SNAKES, head)
}

#[wasm_bindgen]
pub fn ladder_top(bottom: i32) -> i32 {
    lookup(&LADDERS, bottom)
}

#[wasm_bindgen]
pub struct Roll {
    player: usize,
    dice: i32,
    from: i32,
    landed: i32,
    to: i32,
    hit_snake: bool,
    hit_ladder: bool,
    won: bool,
}

#[wasm_bindgen]
impl Roll {
    pub fn player(&self) -> usize {
        self.player
    }
    pub fn dice(&self) -> i32 {
        self.dice
    }
    pub fn from(&self) -> i32 {
        self.from
    }
    pub fn landed(&self) -> i32 {
        self.landed
    }
    pub fn to(&self) -> i32 {
        self.to
    }
    pub fn hit_snake(&self) -> bool {
        self.hit_snake
    }
    pub fn hit_ladder(&self) -> bool {
        self.hit_ladder
    }
    pub fn won(&self) -> bool {
        self.won
    }
}

#[wasm_bindgen]
pub struct Game {
    players: Vec<i32>,
    current: usize,
    rolls: u32,
    game_over: bool,
    rng: u64,
}

#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u64, num_players: usize) -> Game {
        let num_players = num_players.clamp(1, MAX_PLAYERS);
        Game {
            players: vec![0; num_players],
            current: 0,
            rolls: 0,
            game_over: false,
            rng: seed | 1,
        }
    }

    pub fn player_count(&self) -> usize {
        self.players.len()
    }

    pub fn current_player(&self) -> usize {
        self.current
    }

    pub fn positions(&self) -> Vec<i32> {
        self.players.clone()
    }

    pub fn rolls(&self) -> u32 {
        self.rolls
    }

    pub fn is_over(&self) -> bool {
        self.game_over
    }

    pub fn roll(&mut self) -> Roll {
        let from = self.players[self.current];

        let mut result = Roll {
            player: self.current,
            dice: 0,
            from,
            landed: from,
            to: from,
            hit_snake: false,
            hit_ladder: false,
            won: false,
        };

        if self.game_over {
            return result;
        }

        let dice = self.throw_dice();
        result.dice = dice;
        self.rolls += 1;

        let landed = from + dice;
        result.landed = landed;

        if landed > BOARD_SIZE {
            self.next_turn();
            return result;
        }

        let mut to = landed;
        let tail = snake_tail(landed);
        let top = ladder_top(landed);
        if tail != 0 {
            to = tail;
            result.hit_snake = true;
        } else if top != 0 {
            to = top;
            result.hit_ladder = true;
        }

        self.players[self.current] = to;
        result.to = to;

        if to == BOARD_SIZE {
            self.game_over = true;
            result.won = true;
            return result;
        }

        self.next_turn();
        result
    }

    fn next_turn(&mut self) {
        self.current = (self.current + 1) % self.players.len();
    }

    fn throw_dice(&mut self) -> i32 {
        let mut x = self.rng;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.rng = x;
        (x % 6 + 1) as i32
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ladder_climbs() {
        let mut g = Game::new(10, 1);
        let r = g.roll();
        assert_eq!(r.dice(), 4);
        assert!(r.hit_ladder());
        assert_eq!(r.to(), 14);
        assert_eq!(g.positions(), vec![14]);
    }

    #[test]
    fn snake_slides() {
        let mut g = Game::new(10, 1);
        g.roll();
        let r = g.roll();
        assert_eq!(r.dice(), 3);
        assert!(r.hit_snake());
        assert_eq!(r.to(), 7);
    }

    #[test]
    fn overshoot_stays() {
        let mut g = Game::new(1, 1);
        g.players[0] = 97;
        let r = g.roll();
        if r.dice() > 3 {
            assert_eq!(r.to(), 97);
            assert_eq!(g.positions(), vec![97]);
        }
    }

    #[test]
    fn reaching_100_wins() {
        let mut g = Game::new(1, 1);
        g.players[0] = 99;
        loop {
            let r = g.roll();
            if r.won() {
                assert!(g.is_over());
                assert_eq!(g.positions(), vec![100]);
                break;
            }
            assert!(!g.is_over());
            assert!(g.rolls() < 100, "game should finish eventually");
        }
    }

    #[test]
    fn rolls_after_win_are_ignored() {
        let mut g = Game::new(1, 1);
        g.players[0] = 99;
        while !g.is_over() {
            g.roll();
        }
        let rolls_before = g.rolls();
        let r = g.roll();
        assert_eq!(r.dice(), 0);
        assert_eq!(g.rolls(), rolls_before);
    }

    #[test]
    fn turns_alternate() {
        let mut g = Game::new(10, 2);
        assert_eq!(g.current_player(), 0);
        g.roll();
        assert_eq!(g.current_player(), 1);
        let r = g.roll();
        assert_eq!(r.player(), 1);
        assert_eq!(g.current_player(), 0);
    }

    #[test]
    fn only_current_player_moves() {
        let mut g = Game::new(10, 3);
        let r = g.roll();
        assert_eq!(r.player(), 0);
        assert_eq!(g.positions(), vec![14, 0, 0]);
    }

    #[test]
    fn player_count_is_clamped() {
        assert_eq!(Game::new(1, 0).player_count(), 1);
        assert_eq!(Game::new(1, 9).player_count(), MAX_PLAYERS);
    }

    #[test]
    fn four_player_game_finishes() {
        let mut g = Game::new(42, 4);
        while !g.is_over() {
            g.roll();
            assert!(g.rolls() < 5000, "game should finish eventually");
            assert!(g.positions().iter().all(|&p| (0..=100).contains(&p)));
        }
        assert_eq!(g.positions().iter().filter(|&&p| p == 100).count(), 1);
    }
}