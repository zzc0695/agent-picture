import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
const alternatives = {
  "lucide-react": ["@phosphor-icons/react", "@tabler/icons-react", "react-icons", "@heroicons/react"],
  motion: ["framer-motion", "gsap", "@react-spring/web", "animejs"],
  zustand: ["redux", "@reduxjs/toolkit", "jotai", "recoil", "mobx"],
  "@dnd-kit/core": ["react-beautiful-dnd", "@hello-pangea/dnd", "react-dnd"],
};
const errors = Object.entries(alternatives).flatMap(([preferred, packages]) =>
  packages.filter(name => name in dependencies).map(name => `${name}: use ${preferred} for this responsibility.`));
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else console.log("UI dependency policy passed.");
