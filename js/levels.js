'use strict';
// Map legend
//  Walls:  # grey panel   = dark light-strip panel   % detention block
//          C console      W viewport window          @ reactor conduit
//          X exit switch (use it to finish the level)
//  Doors:  D blast door   R red-key door             B blue-key door
//  Spawns: P player       t stormtrooper   T death trooper
//          o probe droid  V Darth Vader
//  Items:  + bacta vial   h bacta tank     a power cells    s deflector shield
//          r red keycard  b blue keycard   g thermal detonators
//          e E-11 rifle   k kyber crystal (Force)
//  Decor:  c cargo crate  y astromech droid
const LEVELS = [
  {
    name: 'Detention Block AA-23',
    floor: 'floorPolish', ceil: 'ceilLights', exitTex: 'exit',
    startAngle: Math.PI / 2,
    quip: "Time to kick Imperial ass and chew bantha gum. And I'm all out of gum.",
    map: [
      '################################',
      '#%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%#',
      '#%P.%.+.%.a.%.t.%.k.%.g.%.t.%s%#',
      '#%..%...%...%...%...%...%...%.%#',
      '#%%D%%%D%%%D%%%D%%%D%%%D%%%D%D%#',
      '#..............................#',
      '#.t..........t........t........#',
      '#%%%%%%%%%%%%%%D%%%%%%%%%%%%%D%#',
      '#CCCCC...............CCCC#.....#',
      '#C...C.....t.........C..C#..e..#',
      '#C.r.D...............D.+C#.....#',
      '#C...C.......c.......C..C###R###',
      '#CCCCC.....t.........CCCC#.....#',
      '#=====..........=====....#..t..#',
      '#.a..=....t.....=..+=....#.....#',
      '#....D..........D...=....#..b..#',
      '#=====..........=====....#.....#',
      '#WWWWWWWWWWWWWWWWWWWWWWWW###B###',
      '#..t.........o.........t..#....#',
      '#.........................D...X#',
      '#+.....a........h.....s...#....#',
      '################################',
    ],
  },
  {
    name: 'Hangar Bay 327',
    floor: 'floorHangar', ceil: 'ceilDark', exitTex: 'exit',
    startAngle: -Math.PI / 2,
    quip: "Hangar bay, huh? Let's park some bucketheads. Permanently.",
    map: [
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'W..............................W',
      'W..cc.....o..........o.....cc..W',
      'W..cc..........T...........cc..W',
      'W.........cc........cc.........W',
      'W...t.....cc...r....cc.....t...W',
      'W..............................W',
      'W..o......t....y......t.....o..W',
      'W.......cc............cc.......W',
      'W...a...cc....h.......cc...s...W',
      'W..............................W',
      'W....t.......T.......t....t....W',
      '####D####D##########D###########',
      '#....#.......#...........#.....#',
      '#.P..#..t....#...C...C...#..t..X',
      '#....D.......D...........R.....#',
      '#.+..#...a...#...g.......#..h..#',
      '#....#.......#...........#.....#',
      '################################',
    ],
  },
  {
    name: 'Death Star Reactor Core',
    floor: 'floorGrate', ceil: 'ceilDark', exitTex: 'core',
    startAngle: 0, boss: true,
    quip: "Something in here smells like the dark side. Or a wampa's armpit.",
    map: [
      '################################',
      '#P.....#.......#@@@@@@@@@@@@@@@#',
      '#......D...t...#@.............@#',
      '#..+...#.......#@..@.....@....@#',
      '#......#...a...#@.............@#',
      '###D#####D######@......V......@#',
      '#..............B..............@#',
      '#..t.......o...#@.............@#',
      '###D#####D######@..@.....@....@#',
      '#......#.......#@....t...t....@#',
      '#..a...#...T...#@......o......@#',
      '#......D.......#@..@.....@....@#',
      '#..h...#.......#@..T.......T..@#',
      '#..s...#...b...#@.............@#',
      '################@@@@@@X@@@@@@@@#',
    ],
  },
];

if (typeof module !== 'undefined') module.exports = LEVELS;
