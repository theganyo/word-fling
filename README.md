# Word-Fling
------------

A simple Node-based word game using Redis.


### Redis Schema

#### word_dictionary (set)

  * values: words

#### players (hash)

  * key: email
  * type: set
  * value:
    type: hash
    * password_hash
    * notifications
      * type: pub/sub

#### logins (set)

  * key: email:password_hash

#### leaderboard (zset)

  * key: email
  * value: wins

#### tile_scores (hash)

  * key: letter
  * value: score

#### games (list)

  * game
  * letter_bag
    * type: list
    * values: tiles
  * turns
    * type: list
    * values:
  * players
    * type: list
    * player
      * tray
