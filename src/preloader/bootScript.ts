export type BootTag = 'OK' | 'WARN' | 'FAIL' | 'INFO' | null;

export type BootLine = {
  delayMs: number;
  tag?: BootTag;
  service?: string;
  message: string;
  highlight?: string[];
  special?: string[];
};

export const BOOT_SCRIPT: BootLine[] = [
  {
    delayMs: 0,
    service: 'kernel',
    message: 'booting nocturnal/labs v4.2.0-quantum #ferment',
    special: ['v4.2.0-quantum'],
  },
  { delayMs: 60, service: 'kernel', message: 'command line: BOOT_IMAGE=/vmlinuz root=UUID=cymatic-...' },
  {
    delayMs: 80,
    service: 'kernel',
    message: 'cosmic background radiation: 2.725 K (within nominal range)',
    highlight: ['2.725 K'],
  },
  { delayMs: 70, service: 'kernel', message: 'detected 47 superpositions, collapsing 1...' },
  { delayMs: 90, service: 'kernel', message: 'reality lock acquired' },
  { delayMs: 120, service: 'systemd[1]', message: 'starting brand identity verification…' },
  { delayMs: 80, service: 'systemd[1]', message: 'starting hue calibration service…' },
  { delayMs: 90, service: 'systemd[1]', message: 'starting wormhole geometry preflight…' },
  { delayMs: 100, service: 'systemd[1]', message: 'starting fractal compiler…' },
  {
    delayMs: 120,
    tag: 'OK',
    service: 'cgroup',
    message: 'mounted /dev/holo at /mnt/palette',
    highlight: ['/dev/holo', '/mnt/palette'],
  },
  { delayMs: 80, tag: 'OK', service: 'graphics', message: 'loaded WebGL context (GPU: detected, drivers: optimistic)' },
  { delayMs: 110, tag: 'OK', service: 'fonts', message: 'subset DM Sans (latin + dingbats)' },
  {
    delayMs: 90,
    tag: 'WARN',
    service: 'coffee',
    message: 'coffee daemon not found — proceeding without',
    special: ['coffee daemon'],
  },
  {
    delayMs: 130,
    tag: 'OK',
    service: 'fractal',
    message: 'julia compiler warmed up (cosine palette: rainbow.cym)',
    highlight: ['rainbow.cym'],
  },
  { delayMs: 90, tag: 'OK', service: 'glow', message: 'iridescent rim activated (5 holo stops)' },
  { delayMs: 100, tag: 'INFO', service: 'audit', message: 'no actual ghosts detected in machine' },
  { delayMs: 70, tag: 'OK', service: 'preload', message: 'self-awareness: nominal' },
  {
    delayMs: 110,
    tag: 'OK',
    service: 'wormhole',
    message: 'event horizon stable, throat radius: 6.0 units',
    highlight: ['6.0 units'],
  },
  { delayMs: 80, tag: 'OK', service: 'particles', message: '2400 cosmic motes injected into pipeline' },
  { delayMs: 130, tag: 'WARN', service: 'paradox', message: 'detected mild causality inversion, recovering…' },
  { delayMs: 100, tag: 'OK', service: 'paradox', message: 'causality nominal — wormhole still pointing forward' },
  {
    delayMs: 90,
    tag: 'OK',
    service: 'coin',
    message: 'minted 1 nocturnal coin (legal tender in 3 dimensions)',
    highlight: ['nocturnal coin'],
  },
  { delayMs: 110, service: 'systemd[1]', message: 'reached target: graphical user interface' },
  {
    delayMs: 80,
    service: 'systemd[1]',
    message: 'reached target: ready to render',
    highlight: ['ready to render'],
  },
];
