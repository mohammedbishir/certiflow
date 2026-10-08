import { Placement } from '@prisma/client';

export const DEMO_USER_EMAIL = 'demo@certiflow.demo';
export const DEMO_ORG_EMAIL = 'school@certiflow.demo';

export const DEMO_ORGANIZATION = {
  name: 'Greenfield Public School (Demo)',
  email: DEMO_ORG_EMAIL,
  phone: '+91 98765 43210',
  website: 'https://example.com',
  signatoryName: 'R. Menon',
  signatoryDesignation: 'Principal',
  logo: null,
  signatureUrl: null,
};

type DesignElement = Record<string, unknown> & { id: string; type: string };

/** Text box positioned by its anchor (center/left/right) and baseline, like the web designer presets. */
function text(el: {
  id: string;
  ax: number;
  ay: number;
  width: number;
  text: string;
  fontSize: number;
  color: string;
  role: string;
  bold?: boolean;
  fontStyle?: 'serif' | 'sans' | 'script';
  letterSpacing?: number;
  height?: number;
}): DesignElement {
  const { ax, ay, ...rest } = el;
  return {
    ...rest,
    type: 'text',
    align: 'center',
    x: Math.round(ax - el.width / 2),
    y: Math.round(ay - el.fontSize),
    height: el.height ?? Math.ceil(el.fontSize * 1.55),
  };
}

function design(title: string, subtitle: string, middle: DesignElement[]) {
  return {
    version: 1,
    width: 1123,
    height: 794,
    background: '#ffffff',
    elements: [
      { id: 'border-outer', type: 'rect', x: 28, y: 28, width: 1067, height: 738, stroke: '#c9a227', strokeWidth: 3, fill: 'transparent' },
      { id: 'border-inner', type: 'rect', x: 42, y: 42, width: 1039, height: 710, stroke: '#d4af37', strokeWidth: 1.5, fill: 'transparent' },
      text({ id: 'org', ax: 561, ay: 92, width: 700, text: '', fontSize: 14, color: '#0f766e', role: 'organizationName', letterSpacing: 4, bold: true }),
      text({ id: 'title', ax: 561, ay: 150, width: 760, text: title, fontSize: 50, color: '#1a1a1a', role: 'static', bold: true, fontStyle: 'serif' }),
      text({ id: 'subtitle', ax: 561, ay: 195, width: 500, text: subtitle, fontSize: 16, color: '#4b5563', role: 'static', letterSpacing: 6 }),
      text({ id: 'given-to', ax: 561, ay: 255, width: 420, text: 'This certificate is proudly presented to', fontSize: 15, color: '#374151', role: 'static' }),
      text({ id: 'participant-name', ax: 561, ay: 325, width: 620, text: 'Participant Name', fontSize: 40, color: '#b8860b', role: 'participantName', bold: true, fontStyle: 'script' }),
      { id: 'name-line', type: 'line', x: 300, y: 345, width: 520, height: 8, stroke: '#d4af37', strokeWidth: 1.5 },
      ...middle,
      { id: 'seal', type: 'icon', iconId: 'seal-gold', x: 521, y: 520, width: 80, height: 80 },
      { id: 'sig-line-left', type: 'line', x: 160, y: 640, width: 220, height: 8, stroke: '#9ca3af', strokeWidth: 1 },
      text({ id: 'sig-left', ax: 270, ay: 665, width: 220, text: 'Event Coordinator', fontSize: 12, color: '#374151', role: 'static', bold: true }),
      text({ id: 'signature', ax: 860, ay: 615, width: 260, text: 'R. Menon', fontSize: 28, color: '#111827', role: 'signature', fontStyle: 'script' }),
      { id: 'sig-line-right', type: 'line', x: 740, y: 640, width: 240, height: 8, stroke: '#111827', strokeWidth: 1.5 },
      text({ id: 'signatory', ax: 860, ay: 665, width: 260, text: '', fontSize: 13, color: '#111827', role: 'signatoryName', bold: true }),
      text({ id: 'signatory-title', ax: 860, ay: 685, width: 260, text: '', fontSize: 11, color: '#6b7280', role: 'signatoryTitle' }),
      text({ id: 'date', ax: 561, ay: 730, width: 200, text: 'Date', fontSize: 12, color: '#6b7280', role: 'date' }),
    ],
  };
}

export const DEMO_TEMPLATES = {
  workshop: {
    name: 'Workshop participation',
    templateType: 'PARTICIPATION' as const,
    titleText: 'Certificate of Participation',
    designJson: design('CERTIFICATE', 'OF PARTICIPATION', [
      text({ id: 'body', ax: 561, ay: 405, width: 680, text: 'for actively participating in the hands-on workshop', fontSize: 15, color: '#4b5563', role: 'static' }),
      text({ id: 'event-name', ax: 561, ay: 455, width: 640, text: 'Event Name', fontSize: 22, color: '#111827', role: 'eventName', bold: true }),
    ]),
  },
  sports: {
    name: 'Sports achievement',
    templateType: 'ACHIEVEMENT' as const,
    titleText: 'Certificate of Achievement',
    designJson: design('CERTIFICATE', 'OF ACHIEVEMENT', [
      text({ id: 'body', ax: 561, ay: 395, width: 680, text: 'for outstanding performance, securing', fontSize: 15, color: '#4b5563', role: 'static' }),
      text({ id: 'placement', ax: 561, ay: 440, width: 400, text: '1st Place', fontSize: 26, color: '#b45309', role: 'placement', bold: true, fontStyle: 'serif' }),
      text({ id: 'game', ax: 561, ay: 475, width: 560, text: 'Game', fontSize: 17, color: '#111827', role: 'gameName', bold: true }),
      text({ id: 'event-name', ax: 561, ay: 503, width: 560, text: 'Event Name', fontSize: 13, color: '#4b5563', role: 'eventName' }),
    ]),
  },
};

const day = 24 * 60 * 60 * 1000;

export const DEMO_WORKSHOP = {
  name: 'React Workshop 2026',
  description: 'A one-day hands-on workshop on building modern web apps with React.',
  location: 'Main Auditorium',
  daysFromNow: -3,
  participants: [
    { fullName: 'Rahul Verma', email: 'rahul.verma@example.com' },
    { fullName: 'Priya Nair', email: 'priya.nair@example.com' },
    { fullName: 'Aditya Kulkarni', email: 'aditya.k@example.com' },
    { fullName: 'Sneha Reddy', email: 'sneha.reddy@example.com' },
  ],
};

export const DEMO_SPORTS = {
  name: 'Annual Sports Meet 2026',
  description: 'Inter-house athletics and games for all classes.',
  location: 'School Sports Ground',
  daysFromNow: -1,
  athletes: [
    { fullName: 'Arjun Das', email: 'arjun.das@example.com' },
    { fullName: 'Kiran Rao', email: 'kiran.rao@example.com' },
    { fullName: 'Vikram Singh', email: 'vikram.singh@example.com' },
    { fullName: 'Ananya Sharma', email: 'ananya.sharma@example.com' },
    { fullName: 'Meera Iyer', email: 'meera.iyer@example.com' },
    { fullName: 'Fatima Khan', email: 'fatima.khan@example.com' },
  ],
  games: [
    {
      name: '100m Relay',
      category: 'Boys U-17',
      results: [
        { email: 'arjun.das@example.com', placement: Placement.FIRST, teamLabel: 'House Blue' },
        { email: 'kiran.rao@example.com', placement: Placement.SECOND, teamLabel: 'House Red' },
        { email: 'vikram.singh@example.com', placement: Placement.THIRD, teamLabel: 'House Green' },
      ],
    },
    {
      name: 'Long Jump',
      category: 'Girls U-14',
      // A tie: two athletes share 1st place.
      results: [
        { email: 'ananya.sharma@example.com', placement: Placement.FIRST, teamLabel: 'House Yellow' },
        { email: 'meera.iyer@example.com', placement: Placement.FIRST, teamLabel: 'House Blue' },
        { email: 'fatima.khan@example.com', placement: Placement.THIRD, teamLabel: 'House Red' },
      ],
    },
    { name: 'Chess', category: 'Open', results: [] },
  ],
};

export function demoDate(daysFromNow: number) {
  return new Date(Date.now() + daysFromNow * day);
}
