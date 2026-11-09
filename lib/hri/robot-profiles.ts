// Capability profiles used by the robot console to show that the same passport JSON means different
// things on different hardware. Two deliberately different robots, both simulated in the browser.
export type RobotCapabilities = {
  mobile: boolean;
  head: boolean;
  arms: boolean;
  speaker: boolean;
  screen: boolean;
  maxSpeedMultiplier: number;
};

export type RobotProfile = {
  id: string;
  name: { th: string; en: string };
  short: { th: string; en: string };
  capabilities: RobotCapabilities;
};

export const ROBOT_PROFILES: RobotProfile[] = [
  {
    id: "a-humanoid",
    name: { th: "Robot A · หุ่นยนต์ดูแลแบบเต็มรูปแบบ", en: "Robot A · Full humanoid care robot" },
    short: {
      th: "เคลื่อนที่ได้ · มีหัวและแขน · ลำโพงและจอ",
      en: "Mobile · head and arms · speaker and screen"
    },
    capabilities: { mobile: true, head: true, arms: true, speaker: true, screen: true, maxSpeedMultiplier: 2 }
  },
  {
    id: "b-screen",
    name: { th: "Robot B · หุ่นเทเลเพรเซนซ์แบบจออย่างเดียว", en: "Robot B · Screen-only telepresence" },
    short: {
      th: "ฐานติดที่ · ไม่มีหัวและแขน · มีลำโพงและจอ",
      en: "Fixed base · no head or arms · speaker and screen"
    },
    capabilities: { mobile: false, head: false, arms: false, speaker: true, screen: true, maxSpeedMultiplier: 1 }
  }
];
