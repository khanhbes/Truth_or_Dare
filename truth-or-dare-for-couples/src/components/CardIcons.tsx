import React from 'react';
import coupleEmbraceImage from '../assets/couple-embrace-icon.png';
import coupleRecliningImage from '../assets/couple-reclining-embrace-icon.png';
import coupleStandingCarryImage from '../assets/couple-standing-carry-icon.png';
import coupleSeatedGazeImage from '../assets/couple-seated-gaze-icon.png';
import coupleLiftedKissImage from '../assets/couple-lifted-kiss-art.png';
import coupleBackHugKissImage from '../assets/couple-back-hug-kiss-art.png';
import coupleForeheadCuddleImage from '../assets/couple-forehead-cuddle-art.png';
import coupleSlowDanceKissImage from '../assets/couple-slow-dance-kiss-art.png';
import coupleSofaCuddleImage from '../assets/couple-sofa-cuddle-art.png';
import couplePlayfulSpinImage from '../assets/couple-playful-spin-art.png';
import coupleUmbrellaKissImage from '../assets/couple-umbrella-kiss-art.png';
import haveSexMythicImage from '../assets/have-sex-mythic-art.png';

interface IconProps {
  className?: string;
}

export const CoupleEmbraceImageIcon: React.FC<IconProps> = ({ className }) => (
  <img
    src={coupleEmbraceImage}
    alt=""
    aria-hidden="true"
    className={`${className || ''} generated-couple-icon object-contain`}
  />
);

export const CoupleRecliningImageIcon: React.FC<IconProps> = ({ className }) => (
  <img
    src={coupleRecliningImage}
    alt=""
    aria-hidden="true"
    className={`${className || ''} generated-couple-icon object-contain`}
  />
);

export const CoupleStandingCarryImageIcon: React.FC<IconProps> = ({ className }) => (
  <img
    src={coupleStandingCarryImage}
    alt=""
    aria-hidden="true"
    className={`${className || ''} generated-couple-icon object-contain`}
  />
);

export const CoupleSeatedGazeImageIcon: React.FC<IconProps> = ({ className }) => (
  <img
    src={coupleSeatedGazeImage}
    alt=""
    aria-hidden="true"
    className={`${className || ''} generated-couple-icon object-contain`}
  />
);

export const CoupleLiftedKissImageIcon: React.FC<IconProps> = ({ className }) => (
  <img
    src={coupleLiftedKissImage}
    alt=""
    aria-hidden="true"
    className={`${className || ''} generated-couple-icon object-contain`}
  />
);

export const CoupleBackHugKissImageIcon: React.FC<IconProps> = ({ className }) => (
  <img
    src={coupleBackHugKissImage}
    alt=""
    aria-hidden="true"
    className={`${className || ''} generated-couple-icon object-contain`}
  />
);

export const CoupleForeheadCuddleImageIcon: React.FC<IconProps> = ({ className }) => (
  <img
    src={coupleForeheadCuddleImage}
    alt=""
    aria-hidden="true"
    className={`${className || ''} generated-couple-icon object-contain`}
  />
);

export const CoupleSlowDanceKissImageIcon: React.FC<IconProps> = ({ className }) => (
  <img
    src={coupleSlowDanceKissImage}
    alt=""
    aria-hidden="true"
    className={`${className || ''} generated-couple-icon object-contain`}
  />
);

export const CoupleSofaCuddleImageIcon: React.FC<IconProps> = ({ className }) => (
  <img
    src={coupleSofaCuddleImage}
    alt=""
    aria-hidden="true"
    className={`${className || ''} generated-couple-icon object-contain`}
  />
);

export const CouplePlayfulSpinImageIcon: React.FC<IconProps> = ({ className }) => (
  <img
    src={couplePlayfulSpinImage}
    alt=""
    aria-hidden="true"
    className={`${className || ''} generated-couple-icon object-contain`}
  />
);

export const CoupleUmbrellaKissImageIcon: React.FC<IconProps> = ({ className }) => (
  <img
    src={coupleUmbrellaKissImage}
    alt=""
    aria-hidden="true"
    className={`${className || ''} generated-couple-icon object-contain`}
  />
);

export const HaveSexMythicImageIcon: React.FC<IconProps> = ({ className }) => (
  <img
    src={haveSexMythicImage}
    alt=""
    aria-hidden="true"
    className={`${className || ''} generated-couple-icon card-custom-icon object-contain`}
  />
);

// ===== LIPS / KISS =====
export const LipsIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 50" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 48C40 48 3 38 3 20C3 12 9 5 18 5C26 5 33 10 40 20C47 10 54 5 62 5C71 5 77 12 77 20C77 38 40 48 40 48Z" />
    <path d="M12 24C12 24 24 30 40 25C56 30 68 24 68 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
  </svg>
);

// ===== KISS MARK (with sparkle dots) =====
export const KissMarkIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 70" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 55C40 55 8 44 8 24C8 15 14 8 22 8C29 8 35 13 40 22C45 13 51 8 58 8C66 8 72 15 72 24C72 44 40 55 40 55Z" />
    <circle cx="18" cy="5" r="2.5" opacity="0.5" />
    <circle cx="62" cy="5" r="2.5" opacity="0.5" />
    <circle cx="10" cy="12" r="1.8" opacity="0.35" />
    <circle cx="70" cy="12" r="1.8" opacity="0.35" />
    <circle cx="40" cy="62" r="2" opacity="0.4" />
  </svg>
);

// ===== KISS ON THE CHEEK =====
export const KissCheekIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M51 9C64 9 72 19 72 32C72 42 67 48 61 52V70H34V57C40 52 43 45 43 37C43 22 43 9 51 9Z" fill="currentColor" />
    <path d="M10 31C10 20 18 12 28 12C37 12 43 18 44 27L36 30C31 32 30 39 35 42L39 44C34 54 24 60 12 59L15 45C12 41 10 36 10 31Z" fill="currentColor" />
    <path d="M43 32C47 28 51 29 54 32C51 36 47 36 43 32Z" fill="white" opacity="0.92" />
    <path d="M57 26L60 22M59 31L64 30M55 22L55 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.78" />
  </svg>
);

// ===== KISS ON THE FOREHEAD =====
export const KissForeheadIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M45 22C60 22 70 33 70 47C70 57 65 63 59 67V74H32V64C26 60 23 53 23 45C23 32 32 22 45 22Z" fill="currentColor" />
    <path d="M8 22C8 12 16 5 26 5C36 5 43 12 43 22L37 25C31 27 30 34 35 37L39 39C32 44 23 43 17 38C11 34 8 28 8 22Z" fill="currentColor" />
    <path d="M38 23C42 19 46 20 49 23C46 27 42 27 38 23Z" fill="white" opacity="0.94" />
    <path d="M50 16L53 11M54 20L60 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
  </svg>
);

// ===== NOSE KISS =====
export const KissNoseIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 66V39C7 22 18 11 32 11C35 11 37 12 39 13C35 18 33 24 34 30L25 38L34 41C35 53 29 61 24 66H7Z" fill="currentColor" />
    <path d="M73 66V39C73 22 62 11 48 11C45 11 43 12 41 13C45 18 47 24 46 30L55 38L46 41C45 53 51 61 56 66H73Z" fill="currentColor" />
    <path d="M40 9C36 4 28 6 28 12C28 18 40 24 40 24C40 24 52 18 52 12C52 6 44 4 40 9Z" fill="white" opacity="0.9" />
    <circle cx="31" cy="29" r="2.5" fill="white" opacity="0.7" />
    <circle cx="49" cy="29" r="2.5" fill="white" opacity="0.7" />
  </svg>
);

// ===== KISS ON THE HAND =====
export const KissHandIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 57C21 52 28 48 38 41L57 27C61 24 66 25 68 29C70 33 68 37 64 40L52 49C59 47 66 46 72 48C75 49 76 53 74 56C71 61 58 62 48 66C38 70 29 75 18 75L8 57Z" fill="currentColor" />
    <path d="M26 22C31 16 38 17 42 22C47 17 54 16 59 22C58 32 42 40 42 40C42 40 26 32 26 22Z" fill="currentColor" />
    <path d="M34 25C38 22 45 22 50 25C46 29 39 29 34 25Z" fill="white" opacity="0.9" />
    <path d="M28 42L24 37M34 39L33 33" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
  </svg>
);

// ===== KISS ON THE NECK =====
export const KissNeckIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M37 7C54 7 65 19 65 34C65 43 61 49 55 53V62C62 65 68 69 72 75H16C20 68 27 64 34 61V51C26 46 22 39 22 30C22 17 28 7 37 7Z" fill="currentColor" />
    <path d="M9 35C9 25 16 18 26 18C34 18 40 24 40 32L34 35C28 37 27 44 33 47L38 49C31 55 22 56 15 51C11 47 9 41 9 35Z" fill="currentColor" opacity="0.86" />
    <path d="M43 54C47 50 52 51 55 54C52 59 47 59 43 54Z" fill="white" opacity="0.94" />
    <path d="M58 48L62 44M60 53L66 52" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.74" />
  </svg>
);

// ===== KISS ON THE SHOULDER =====
export const KissShoulderIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M47 8C58 8 66 17 66 28C66 36 62 42 57 46V53C67 56 73 63 76 74H18C20 61 28 54 39 51V44C33 40 29 34 29 26C29 16 36 8 47 8Z" fill="currentColor" />
    <path d="M7 37C7 27 14 20 23 20C31 20 37 26 37 34L32 37C27 40 28 46 33 48L39 50C33 57 22 59 14 53C9 49 7 43 7 37Z" fill="currentColor" opacity="0.86" />
    <path d="M49 57C53 53 58 54 61 57C58 62 53 62 49 57Z" fill="white" opacity="0.94" />
    <path d="M64 53L69 50M64 59L71 60" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.72" />
  </svg>
);

// ===== KISS ON THE HAIR / CROWN =====
export const KissHairIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 35C22 18 32 8 47 8C63 8 72 20 72 36V67H60V42C60 31 55 25 47 25C39 25 34 31 34 42V67H18C21 58 22 48 22 35Z" fill="currentColor" />
    <path d="M7 22C7 13 14 6 23 6C32 6 39 12 39 21L34 24C28 27 28 33 34 36L39 38C32 44 22 44 15 38C10 34 7 28 7 22Z" fill="currentColor" opacity="0.86" />
    <path d="M38 19C42 15 47 16 50 19C47 24 42 24 38 19Z" fill="white" opacity="0.94" />
    <path d="M52 13L55 8M56 17L62 15" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.72" />
  </svg>
);

// ===== BLOWN KISS =====
export const KissAirIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M28 54C28 54 7 47 7 32C7 24 13 18 21 18C25 18 29 21 33 26C37 21 41 18 45 18C53 18 59 24 59 32C59 47 38 54 28 58L28 54Z" fill="currentColor" />
    <path d="M15 34C22 38 35 38 50 33" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.68" />
    <path d="M63 15C60 10 52 12 52 18C52 24 63 30 63 30C63 30 74 24 74 18C74 12 66 10 63 15Z" fill="currentColor" />
    <path d="M56 42C53 38 47 40 47 45C47 50 56 55 56 55C56 55 65 50 65 45C65 40 59 38 56 42Z" fill="currentColor" opacity="0.72" />
    <path d="M61 35L67 34M58 61L62 66" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
  </svg>
);

// ===== KISS ON THE LIPS =====
export const KissLipsIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 69V39C5 21 16 10 31 10C35 10 38 11 40 13C36 18 34 24 35 30L26 39L35 42C36 54 30 63 25 69H5Z" fill="currentColor" />
    <path d="M75 69V39C75 21 64 10 49 10C45 10 42 11 40 13C44 18 46 24 45 30L54 39L45 42C44 54 50 63 55 69H75Z" fill="currentColor" />
    <path d="M34 40C37 37 39 38 40 40C41 38 43 37 46 40C44 45 40 47 40 47C40 47 36 45 34 40Z" fill="white" opacity="0.94" />
    <path d="M40 8C37 4 31 6 31 11C31 16 40 21 40 21C40 21 49 16 49 11C49 6 43 4 40 8Z" fill="white" opacity="0.76" />
  </svg>
);

// ===== KISS WHILE HUGGING =====
export const KissHugIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="29" cy="22" r="13" fill="currentColor" />
    <circle cx="51" cy="22" r="13" fill="currentColor" />
    <path d="M17 71V44C17 34 24 28 32 28L40 36L48 28C56 28 63 34 63 44V71H17Z" fill="currentColor" />
    <path d="M12 43C20 39 29 42 40 53C51 42 60 39 68 43M13 43C13 58 22 68 40 73M67 43C67 58 58 68 40 73" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    <path d="M36 25C38 22 42 22 44 25C42 29 40 31 40 31C40 31 38 29 36 25Z" fill="white" opacity="0.94" />
    <path d="M40 45C36 39 27 42 27 49C27 57 40 64 40 64C40 64 53 57 53 49C53 42 44 39 40 45Z" fill="white" opacity="0.62" />
  </svg>
);

// ===== KISS ON THE TEMPLE =====
export const KissTempleIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M48 8C62 8 71 19 71 33C71 43 66 49 60 53V70H32V58C25 53 21 45 21 36C21 20 32 8 48 8Z" fill="currentColor" />
    <path d="M7 27C7 17 15 10 25 10C34 10 41 17 41 26L35 29C29 31 29 38 34 41L39 43C33 50 23 51 15 45C10 41 7 34 7 27Z" fill="currentColor" opacity="0.86" />
    <path d="M45 29C49 25 54 26 57 29C54 34 49 34 45 29Z" fill="white" opacity="0.94" />
    <circle cx="55" cy="37" r="3" fill="white" opacity="0.55" />
    <path d="M60 25L65 21M61 31L68 30" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.72" />
  </svg>
);

// ===== KISS ON CLOSED EYES =====
export const KissEyelidIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M48 8C63 8 72 20 72 35C72 45 68 52 61 57V72H32V60C25 55 21 47 21 37C21 20 32 8 48 8Z" fill="currentColor" />
    <path d="M7 24C7 14 15 7 25 7C34 7 41 14 41 23L35 26C29 29 29 35 35 38L40 40C33 47 23 48 15 42C10 38 7 31 7 24Z" fill="currentColor" opacity="0.86" />
    <path d="M45 32C49 28 54 29 57 32C54 37 49 37 45 32Z" fill="white" opacity="0.94" />
    <path d="M48 43C53 47 59 47 64 42M51 40L49 37M57 39V35M62 40L65 37" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.76" />
  </svg>
);

// ===== KISS ON THE EAR =====
export const KissEarIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M48 7C63 7 72 19 72 34C72 44 67 51 61 55V72H33V59C26 54 22 46 22 37C22 20 33 7 48 7Z" fill="currentColor" />
    <path d="M8 35C8 24 16 16 26 16C35 16 42 23 42 33L36 36C30 39 30 45 36 48L41 50C34 57 24 58 16 52C11 48 8 42 8 35Z" fill="currentColor" opacity="0.86" />
    <path d="M54 31C62 31 65 38 62 45C60 50 56 52 52 51C49 50 48 46 51 43C54 40 54 37 51 36" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.78" />
    <path d="M43 38C47 34 52 35 55 38C52 43 47 43 43 38Z" fill="white" opacity="0.95" />
    <path d="M64 32L69 28M66 38H72" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
  </svg>
);

// ===== KISS UNDER MISTLETOE =====
export const KissMistletoeIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 27C28 25 20 18 19 7C29 7 37 12 40 22C43 12 51 7 61 7C60 18 52 25 40 27Z" fill="currentColor" />
    <circle cx="35" cy="25" r="4" fill="white" opacity="0.9" />
    <circle cx="45" cy="25" r="4" fill="white" opacity="0.9" />
    <path d="M7 73V51C7 37 16 28 29 28C34 28 38 30 40 33C36 37 35 42 36 47L29 52L37 55C36 64 32 69 28 73H7Z" fill="currentColor" />
    <path d="M73 73V51C73 37 64 28 51 28C46 28 42 30 40 33C44 37 45 42 44 47L51 52L43 55C44 64 48 69 52 73H73Z" fill="currentColor" />
    <path d="M36 53C38 50 42 50 44 53C42 57 40 59 40 59C40 59 38 57 36 53Z" fill="white" opacity="0.94" />
  </svg>
);

// ===== SURPRISE KISS =====
export const KissSurpriseIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M47 9C62 9 72 20 72 35C72 44 68 51 61 55V72H33V59C27 54 23 47 23 38C23 21 33 9 47 9Z" fill="currentColor" />
    <path d="M8 35C8 24 16 16 26 16C35 16 42 23 42 33L36 36C30 39 30 45 36 48L41 50C34 56 24 57 16 51C11 47 8 41 8 35Z" fill="currentColor" opacity="0.88" />
    <path d="M42 38C46 34 51 35 54 38C51 43 46 43 42 38Z" fill="white" opacity="0.96" />
    <path d="M57 19V28M52 23L48 18M62 23L67 18" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.82" />
    <circle cx="57" cy="34" r="2.5" fill="white" opacity="0.72" />
  </svg>
);

// ===== GOODNIGHT KISS =====
export const KissGoodnightIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M58 6C48 9 42 18 42 29C42 42 52 52 65 52C69 52 73 51 76 49C72 60 62 67 50 67C34 67 21 54 21 38C21 21 34 8 50 8C53 8 56 8 58 6Z" fill="currentColor" opacity="0.72" />
    <path d="M9 60V43C9 32 16 25 26 25C31 25 35 27 38 31C35 35 34 39 35 44L29 48L36 51C35 57 32 61 29 65H13L9 60Z" fill="currentColor" />
    <path d="M34 30C38 26 43 27 46 30C43 35 38 35 34 30Z" fill="white" opacity="0.94" />
    <path d="M14 16L16 11L18 16L23 18L18 20L16 25L14 20L9 18L14 16ZM31 10L33 6L35 10L39 12L35 14L33 18L31 14L27 12L31 10Z" fill="white" opacity="0.82" />
  </svg>
);

// ===== KISS IN THE RAIN =====
export const KissRainIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 34C9 17 22 7 40 7C58 7 71 17 74 34C67 29 60 29 54 34C47 29 33 29 26 34C20 29 13 29 6 34Z" fill="currentColor" />
    <path d="M40 31V67C40 73 47 75 51 70" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    <circle cx="30" cy="48" r="10" fill="currentColor" />
    <circle cx="50" cy="48" r="10" fill="currentColor" />
    <path d="M20 72V60C20 53 25 49 32 49L40 56L48 49C55 49 60 53 60 60V72H20Z" fill="currentColor" />
    <path d="M36 49C38 46 42 46 44 49C42 53 40 55 40 55C40 55 38 53 36 49Z" fill="white" opacity="0.94" />
    <path d="M14 40L11 47M67 40L64 47" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.72" />
  </svg>
);

// ===== FEMALE SILHOUETTE (dancing/sexy pose) =====
export const SexyDanceIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 50 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <circle cx="25" cy="8" r="7" />
    <path d="M25 15C25 15 18 22 16 32C14 42 18 48 20 50L14 72C14 72 16 74 18 72L24 52L26 52L32 72C32 72 34 74 36 72L30 50C32 48 36 42 34 32C32 22 25 15 25 15Z" />
    <path d="M16 25L8 32" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <path d="M34 22L42 18" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fill="none" />
  </svg>
);

// ===== LINGERIE / UNDERWEAR =====
export const LingerieIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 70 60" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 8C15 8 10 25 15 30C20 35 30 32 35 28C40 32 50 35 55 30C60 25 55 8 55 8" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M15 30L12 45L35 50L58 45L55 30" fill="none" stroke="currentColor" strokeWidth="3" />
    <path d="M35 28V50" stroke="currentColor" strokeWidth="2" opacity="0.4" />
    <circle cx="35" cy="18" r="2" opacity="0.3" />
  </svg>
);

// ===== HAND TOUCH / CARESS =====
export const HandTouchIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 70 70" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 18C50 18 47 12 43 12C39 12 37 16 37 20V38L33 34C30 31 25 31 23 34C21 37 22 41 25 44L40 58C43 61 47 63 52 63H56C63 63 68 57 68 50V32C68 28 65 25 62 25C60 25 58 26 57 28V22C57 18 54 15 51 15" />
    <path d="M8 30C8 30 12 22 18 25C24 28 20 38 20 38" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
  </svg>
);

// ===== BLINDFOLD / MASK =====
export const BlindfoldIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 50" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 12C8 12 20 5 40 5C60 5 72 12 72 12V35C72 35 60 42 40 42C20 42 8 35 8 35V12Z" rx="8" />
    <circle cx="28" cy="23" r="9" fill="black" opacity="0.2" />
    <circle cx="52" cy="23" r="9" fill="black" opacity="0.2" />
    <path d="M62 10L76 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M62 37L76 42" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// ===== HEART (classic) =====
export const HeartIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 75" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 68L34 62.5C15 45 4 35 4 22C4 12 12 4 22 4C28 4 34 7 40 13C46 7 52 4 58 4C68 4 76 12 76 22C76 35 65 45 46 62.5L40 68Z" />
  </svg>
);

// ===== FLAME / FIRE =====
export const FlameIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 55 75" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M27.5 3C27.5 3 10 25 10 45C10 58 18 68 27.5 72C24 60 32 48 36 42C40 36 45 28 45 18C45 14 42 10 38 6C38 18 32 24 28 30C25 24 27.5 12 27.5 3Z" />
    <path d="M20 48C20 58 27 65 27.5 72C20 67 15 57 18 48C20 42 22 40 20 48Z" opacity="0.4" />
  </svg>
);

// ===== WINE GLASS =====
export const WineGlassIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 50 75" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 3H40L36 32C36 40 30 46 25 46C20 46 14 40 14 32L10 3Z" />
    <rect x="22" y="46" width="6" height="18" rx="3" />
    <rect x="14" y="64" width="22" height="5" rx="2.5" />
    <path d="M16 14H34" stroke="white" strokeWidth="1.5" opacity="0.15" />
  </svg>
);

// ===== COUPLE SILHOUETTE (close embrace) =====
export const CoupleEmbraceIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 70 75" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <circle cx="25" cy="10" r="8" />
    <circle cx="45" cy="10" r="8" />
    <path d="M25 18C25 18 18 24 16 35C14 46 18 55 20 58L16 72H24L27 58" />
    <path d="M45 18C45 18 52 24 54 35C56 46 52 55 50 58L54 72H46L43 58" />
    <path d="M27 30C27 30 33 28 35 32C37 28 43 30 43 30" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    <path d="M27 58L35 52L43 58" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
  </svg>
);

// ===== EAR (whisper) =====
export const EarWhisperIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 60 70" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M38 8C50 14 54 30 50 46C46 58 38 64 30 66C24 68 18 64 16 58C13 52 15 46 20 42C25 38 27 34 27 28C27 22 22 18 18 18C14 18 12 22 12 26" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    <path d="M45 20L55 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
    <path d="M48 28L58 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
    <path d="M49 36L58 36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.2" />
  </svg>
);

// ===== EYES (gazing) =====
export const EyesIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 45" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 5C18 5 3 22 3 22C3 22 18 40 40 40C62 40 77 22 77 22C77 22 62 5 40 5Z" fill="none" stroke="currentColor" strokeWidth="4" />
    <circle cx="40" cy="22" r="11" />
    <circle cx="44" cy="18" r="4" fill="black" opacity="0.25" />
  </svg>
);

// ===== CAMERA / SELFIE =====
export const CameraIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 70 55" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="14" width="64" height="38" rx="6" />
    <path d="M24 7H46L50 14H20L24 7Z" />
    <circle cx="35" cy="33" r="12" fill="black" opacity="0.3" />
    <circle cx="35" cy="33" r="8" />
    <circle cx="38" cy="30" r="2.5" fill="black" opacity="0.2" />
  </svg>
);

// ===== MUSIC NOTE =====
export const MusicIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 50 65" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 50V12L42 5V43" stroke="currentColor" strokeWidth="4" fill="none" />
    <circle cx="10" cy="53" r="8" />
    <circle cx="36" cy="46" r="8" />
  </svg>
);

// ===== PHONE / TEXT MESSAGE =====
export const PhoneIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 45 70" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="3" width="35" height="64" rx="6" />
    <rect x="9" y="10" width="27" height="44" rx="2" fill="black" opacity="0.3" />
    <circle cx="22.5" cy="61" r="3" fill="black" opacity="0.2" />
    <path d="M14 25L20 22L26 28L31 24" stroke="white" strokeWidth="1.5" opacity="0.3" fill="none" />
  </svg>
);

// ===== MASSAGE HANDS =====
export const MassageIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 75 60" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 38C18 38 22 18 37 12C52 18 56 38 56 38" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <circle cx="22" cy="48" r="5" opacity="0.6" />
    <circle cx="37" cy="52" r="5" opacity="0.6" />
    <circle cx="52" cy="48" r="5" opacity="0.6" />
    <path d="M32 5C34 0 40 0 42 5" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.35" />
    <path d="M26 9C28 4 34 4 36 9" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
  </svg>
);

// ===== HUG / EMBRACE =====
export const HugIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 70" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <circle cx="28" cy="14" r="10" />
    <circle cx="52" cy="14" r="10" />
    <path d="M14 32C14 32 18 24 28 24C34 24 38 28 40 32C42 28 46 24 52 24C62 24 66 32 66 32L60 56C58 62 54 66 48 66H32C26 66 22 62 20 56L14 32Z" />
    <path d="M24 38C24 38 34 44 40 48" stroke="black" strokeWidth="2" opacity="0.1" fill="none" />
    <path d="M56 38C56 38 46 44 40 48" stroke="black" strokeWidth="2" opacity="0.1" fill="none" />
  </svg>
);

// ===== HIGH HEELS / LEGS =====
export const HighHeelsIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 60 70" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 5C22 5 18 30 16 42C14 52 8 56 8 60C8 64 12 66 18 66H35C38 66 40 64 40 62C40 58 30 56 28 50C26 44 28 30 30 20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <path d="M38 5C38 5 42 30 44 42C46 52 52 56 52 60C52 64 48 66 42 66H28" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
  </svg>
);

// ===== BODY CURVES (back/spine) =====
export const BodyCurvesIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 50 75" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 5C25 5 15 15 12 30C9 45 15 55 20 62C22 65 25 68 25 72" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M25 5C25 5 35 15 38 30C41 45 35 55 30 62C28 65 25 68 25 72" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" opacity="0.4" />
    <circle cx="25" cy="30" r="3" opacity="0.25" />
    <circle cx="25" cy="45" r="2.5" opacity="0.2" />
  </svg>
);

// ===== HANDCUFFS =====
export const HandcuffsIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 55" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <circle cx="22" cy="28" r="16" fill="none" stroke="currentColor" strokeWidth="5" />
    <circle cx="58" cy="28" r="16" fill="none" stroke="currentColor" strokeWidth="5" />
    <path d="M38 28H42" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    <rect x="18" y="42" width="8" height="10" rx="2" opacity="0.6" />
    <rect x="54" y="42" width="8" height="10" rx="2" opacity="0.6" />
  </svg>
);

// ===== FEATHER (teasing) =====
export const FeatherIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 45 75" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 72L24 50C26 38 32 28 35 20C38 12 38 5 34 2C30 -1 24 2 22 8C20 14 22 24 26 30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M24 50C18 46 12 38 14 30C16 24 22 26 22 26" fill="currentColor" opacity="0.55" />
    <path d="M26 38C32 36 38 28 36 22C34 16 28 18 28 18" fill="currentColor" opacity="0.55" />
    <path d="M25 55C20 52 16 44 18 38C20 32 24 34 24 34" fill="currentColor" opacity="0.4" />
  </svg>
);

// ===== ICE CUBE =====
export const IceCubeIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 55 55" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M27.5 3L52 16V39L27.5 52L3 39V16L27.5 3Z" fill="none" stroke="currentColor" strokeWidth="3.5" />
    <path d="M27.5 3V52" stroke="currentColor" strokeWidth="2" opacity="0.25" />
    <path d="M3 16L52 39" stroke="currentColor" strokeWidth="2" opacity="0.15" />
    <path d="M52 16L3 39" stroke="currentColor" strokeWidth="2" opacity="0.15" />
    <circle cx="27.5" cy="27.5" r="5" opacity="0.3" />
    <circle cx="16" cy="10" r="2" opacity="0.2" />
    <circle cx="40" cy="44" r="2" opacity="0.2" />
  </svg>
);

// ===== LAP SIT (intimate pose) =====
export const LapSitIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 65 70" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="8" r="7" />
    <path d="M32 15V32L22 48" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M32 32L42 48" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M20 24L32 20L44 26" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M15 52H50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.4" fill="none" />
    <path d="M18 58L15 68" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.35" fill="none" />
    <path d="M47 58L50 68" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.35" fill="none" />
  </svg>
);

// ===== NECK / COLLARBONE =====
export const NeckIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 55 70" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 30C18 30 14 10 27.5 5C41 10 37 30 37 30" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <path d="M10 30C10 30 6 48 6 56C6 65 16 70 27.5 70C39 70 49 65 49 56C49 48 45 30 45 30" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <path d="M22 22L33 25" stroke="currentColor" strokeWidth="2" opacity="0.25" />
  </svg>
);

// ===== SPARKLE / ATTRACTION =====
export const SparkleIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 60 60" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 3L34 22L52 16L38 28L48 48L30 36L12 48L22 28L8 16L26 22L30 3Z" />
    <circle cx="50" cy="6" r="3" opacity="0.4" />
    <circle cx="10" cy="8" r="2" opacity="0.3" />
    <circle cx="52" cy="52" r="2.5" opacity="0.35" />
  </svg>
);

// ===== TONGUE / LICK =====
export const TongueIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 60 65" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 45C30 45 5 36 5 20C5 12 11 6 19 6C25 6 30 10 30 18" />
    <path d="M30 45C30 45 55 36 55 20C55 12 49 6 41 6C35 6 30 10 30 18" />
    <path d="M22 42C22 42 26 58 30 60C34 58 38 42 38 42" fill="currentColor" opacity="0.7" />
    <path d="M30 46V56" stroke="black" strokeWidth="1.5" opacity="0.15" />
  </svg>
);

// ===== HANDS TOGETHER / INTERLOCKED =====
export const HandsTogetherIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 75 55" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 32C5 32 15 20 25 20C30 20 35 24 38 28" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M70 32C70 32 60 20 50 20C45 20 40 24 37 28" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M38 28C38 28 37.5 35 37 28" stroke="currentColor" strokeWidth="3" fill="none" />
    <circle cx="37.5" cy="14" r="5" opacity="0.35" />
    <path d="M34 10L37.5 6L41 10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
  </svg>
);

// ===== BUTTON UNDO / UNDRESS =====
export const ButtonUndoIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 50 75" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="3" width="30" height="69" rx="6" fill="none" stroke="currentColor" strokeWidth="3" />
    <circle cx="25" cy="18" r="5" />
    <circle cx="25" cy="36" r="5" />
    <circle cx="25" cy="54" r="5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 2.5" />
    <path d="M19 54L25 48L31 54" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.45" />
  </svg>
);

// ===== HEARTBEAT =====
export const HeartbeatIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 60" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 52L35 47.5C18 32 8 23 8 12C8 4 14.5 0 23 0C28 0 33 2.5 40 8C47 2.5 52 0 57 0C65.5 0 72 4 72 12C72 23 62 32 45 47.5L40 52Z" />
    <path d="M3 38H18L22 28L28 48L34 32L38 38H77" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
  </svg>
);

// ===== PLAYFUL ATTENTION =====
export const PlayfulAttentionIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="35" cy="41" r="27" fill="currentColor" />
    <path d="M23 36C26 33 30 33 33 36M45 34H51" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.88" />
    <path d="M25 51C31 57 41 58 48 50" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.82" />
    <path d="M62 6L65 14L73 17L65 20L62 28L59 20L51 17L59 14L62 6Z" fill="currentColor" />
    <path d="M68 37L70 42L75 44L70 46L68 51L66 46L61 44L66 42L68 37Z" fill="currentColor" opacity="0.62" />
    <path d="M13 23L7 17M12 31L4 30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.58" />
  </svg>
);

// ===== LOVE SONG / POEM =====
export const LoveSongPoemIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 15H67V64C60 60 53 60 46 64C41 67 36 68 32 68V15Z" fill="currentColor" />
    <path d="M32 15C37 19 43 19 48 15M32 68C37 64 43 64 48 68" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.34" />
    <path d="M49 31C46 25 37 29 39 36C41 42 49 46 49 46C49 46 58 42 60 36C62 29 53 25 49 31Z" fill="white" opacity="0.76" />
    <path d="M23 18V51" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M23 20L38 16V26L23 30" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
    <ellipse cx="15" cy="56" rx="10" ry="7" transform="rotate(-18 15 56)" fill="currentColor" />
    <path d="M11 10L8 6M16 9V4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
  </svg>
);

// ===== MUSIC + PERFUME =====
export const MusicPerfumeIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="38" y="35" width="33" height="36" rx="9" fill="currentColor" />
    <rect x="48" y="21" width="14" height="15" rx="3" fill="currentColor" />
    <path d="M45 17H65M61 12H72" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    <path d="M54 47C50 42 43 46 45 52C47 57 54 61 54 61C54 61 62 57 63 52C65 46 58 42 54 47Z" fill="white" opacity="0.72" />
    <path d="M24 15V51" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M24 18L40 14V25L24 29" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
    <ellipse cx="16" cy="56" rx="10" ry="7" transform="rotate(-18 16 56)" fill="currentColor" />
    <path d="M7 26L4 22M12 22V17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
  </svg>
);

// ===== ROMANTIC OUTFIT =====
export const RomanticOutfitIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 8C40 3 47 3 47 9C47 13 43 14 40 17L16 31M40 17L64 31M16 31H64" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M29 27L22 39L30 44L26 70H54L50 44L58 39L51 27H29Z" fill="currentColor" />
    <path d="M32 28C34 34 37 36 40 36C43 36 46 34 48 28" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.52" />
    <path d="M65 8L68 15L75 18L68 21L65 28L62 21L55 18L62 15L65 8Z" fill="currentColor" />
    <path d="M13 48L15 53L20 55L15 57L13 62L11 57L6 55L11 53L13 48Z" fill="currentColor" opacity="0.62" />
  </svg>
);

// ===== BODY + KISS LOCATION =====
export const BodyKissIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M31 7C26 17 27 25 31 32C24 39 20 50 20 69H60C60 50 56 39 49 32C53 25 54 17 49 7C44 12 36 12 31 7Z" fill="currentColor" />
    <path d="M31 32C35 36 45 36 49 32M40 38V66" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.34" />
    <path d="M47 40C51 35 58 37 60 42C58 48 52 51 47 52C42 51 36 48 34 42C36 37 43 35 47 40Z" fill="white" opacity="0.84" />
    <path d="M36 42C42 45 52 45 58 42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.38" />
    <circle cx="66" cy="28" r="3" fill="currentColor" opacity="0.55" />
    <circle cx="70" cy="20" r="2" fill="currentColor" opacity="0.35" />
  </svg>
);

// ===== EYES + VOICE =====
export const EyesVoiceIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 30C16 17 28 12 41 14C51 16 59 22 65 30C58 40 48 46 36 46C24 46 14 40 7 30Z" fill="currentColor" />
    <ellipse cx="36" cy="30" rx="9" ry="10" fill="white" opacity="0.84" />
    <circle cx="36" cy="30" r="4" fill="currentColor" />
    <path d="M34 52H65C70 52 73 56 73 61V66C73 71 69 74 64 74H50L41 79V74H34C29 74 26 71 26 66V60C26 56 29 52 34 52Z" fill="currentColor" />
    <path d="M48 61C45 56 38 60 40 65C42 69 48 72 48 72C48 72 55 69 56 65C58 60 51 56 48 61Z" fill="white" opacity="0.78" />
    <path d="M69 23L75 18M69 31H77" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.58" />
  </svg>
);

// ===== THREE KISSES =====
export const TripleKissIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 73V53C15 42 21 36 30 32C26 28 24 23 24 18C24 10 30 5 38 5C49 5 56 14 56 25C56 34 51 40 45 44V73H15Z" fill="currentColor" opacity="0.78" />
    <path d="M37 22C41 25 46 25 50 22" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.64" />
    <path d="M61 16C64 12 70 14 70 19C70 24 62 28 62 28C62 28 54 24 54 19C54 14 59 12 61 16Z" fill="currentColor" />
    <path d="M61 38C64 34 70 36 70 41C70 46 62 50 62 50C62 50 54 46 54 41C54 36 59 34 61 38Z" fill="currentColor" />
    <path d="M57 60C60 56 66 58 66 63C66 68 58 72 58 72C58 72 50 68 50 63C50 58 55 56 57 60Z" fill="currentColor" />
    <circle cx="73" cy="31" r="2" fill="currentColor" opacity="0.45" />
  </svg>
);

// ===== UNBUTTON + BACK CARESS =====
export const UnbuttonBackCaressIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 16L29 7L40 18L51 7L67 16L62 72H18L13 16Z" fill="currentColor" />
    <path d="M29 8L40 18L51 8M40 19V70" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
    <circle cx="40" cy="31" r="3" fill="white" opacity="0.82" />
    <circle cx="40" cy="45" r="3" fill="white" opacity="0.82" />
    <circle cx="40" cy="59" r="3" fill="none" stroke="white" strokeWidth="2.5" strokeDasharray="2.5 2" opacity="0.76" />
    <path d="M70 31C61 37 57 46 56 59" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
    <path d="M67 27L73 30L70 36" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.72" />
  </svg>
);

// ===== BLINDFOLD KISS =====
export const BlindfoldKissIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 72V45C5 26 16 12 31 12C35 12 38 14 40 17C35 22 33 28 34 35L27 41L35 45C35 56 29 66 24 72H5Z" fill="currentColor" />
    <path d="M75 72V45C75 26 64 12 49 12C45 12 42 14 40 17C45 22 47 28 46 35L53 41L45 45C45 56 51 66 56 72H75Z" fill="currentColor" opacity="0.8" />
    <path d="M13 28C20 24 28 24 36 28L34 37C27 34 20 34 13 37V28Z" fill="white" opacity="0.82" />
    <path d="M12 29L6 25M35 28L40 24" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    <path d="M38 39C40 36 42 36 44 39C42 43 41 44 41 44C41 44 39 43 38 39Z" fill="white" opacity="0.9" />
    <path d="M29 54C36 50 44 50 51 54" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.48" />
  </svg>
);

// ===== ICE TRACE ON BACK =====
export const IceBackTraceIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M28 6C25 17 28 25 33 31C26 39 23 50 23 72H58C58 50 55 39 48 31C53 25 56 17 52 6C45 12 35 12 28 6Z" fill="currentColor" />
    <path d="M40 20C36 34 37 50 44 65" stroke="white" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 6" opacity="0.76" />
    <path d="M5 11L20 6L31 18L17 25L5 11Z" fill="currentColor" />
    <path d="M20 6L18 19L5 11M18 19L31 18" stroke="white" strokeWidth="2" opacity="0.56" />
    <path d="M11 34L8 39M20 32L19 39" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.48" />
  </svg>
);

// ===== COLLARBONE TRACE =====
export const CollarboneTraceIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M31 7V23C22 27 14 35 10 47V73H70V47C66 35 58 27 49 23V7H31Z" fill="currentColor" />
    <path d="M20 38C28 31 35 31 40 36C45 31 52 31 60 38" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.64" />
    <path d="M65 18C56 24 50 31 44 42C39 50 33 57 22 63" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.88" />
    <circle cx="66" cy="17" r="5" fill="white" opacity="0.9" />
    <path d="M45 42L42 37M45 42L50 40" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
  </svg>
);

// ===== DRESS / OUTFIT =====
export const DressIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 55 70" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 3L16 18L8 22L18 28L12 65H43L37 28L47 22L39 18L35 3H20Z" />
    <path d="M20 3C20 3 24 8 27.5 8C31 8 35 3 35 3" fill="none" stroke="black" strokeWidth="1.5" opacity="0.15" />
  </svg>
);

// ===== ROSE =====
export const RoseIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 34C25 34 20 24 26 16C31 9 40 15 40 15C40 15 49 9 54 16C60 24 55 34 40 34Z" fill="currentColor" />
    <path d="M40 33V73M40 51C31 45 25 46 21 51C28 58 35 57 40 54M41 44C49 37 57 38 61 43C55 50 48 51 41 48" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M30 18C33 22 37 24 40 24C43 24 47 22 50 18" stroke="white" strokeWidth="2" opacity="0.22" strokeLinecap="round" />
  </svg>
);

// ===== RING =====
export const RingIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="49" r="21" stroke="currentColor" strokeWidth="7" />
    <path d="M27 21L34 10H46L53 21L40 32L27 21Z" fill="currentColor" />
    <path d="M34 10L40 21L46 10M28 21H52" stroke="white" strokeWidth="1.8" opacity="0.3" />
  </svg>
);

// ===== GIFT =====
export const GiftIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="31" width="56" height="39" rx="5" fill="currentColor" />
    <rect x="8" y="24" width="64" height="16" rx="5" fill="currentColor" />
    <path d="M40 24C28 24 20 19 22 13C25 5 37 13 40 24ZM40 24C52 24 60 19 58 13C55 5 43 13 40 24Z" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
    <path d="M40 25V70" stroke="white" strokeWidth="4" opacity="0.28" />
  </svg>
);

// ===== MOON =====
export const MoonIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M56 61C35 68 15 53 17 32C19 17 31 8 44 7C33 17 31 32 39 43C46 53 56 57 67 54C64 57 60 59 56 61Z" />
    <path d="M59 13L62 20L69 23L62 26L59 33L56 26L49 23L56 20L59 13Z" opacity="0.62" />
  </svg>
);

// ===== CANDLE =====
export const CandleIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 5C40 5 28 19 30 30C31 37 35 40 40 42C38 33 44 28 47 23C50 17 46 10 40 5Z" />
    <rect x="23" y="36" width="34" height="37" rx="6" />
    <path d="M25 47C34 42 45 51 55 45" stroke="white" strokeWidth="2" opacity="0.25" />
  </svg>
);

// ===== KEY =====
export const KeyIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="27" cy="30" r="16" stroke="currentColor" strokeWidth="8" />
    <path d="M39 42L68 71M55 58L64 49M62 65L71 56" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <circle cx="27" cy="30" r="5" fill="currentColor" />
  </svg>
);

// ===== LOCK =====
export const LockIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23 34V25C23 15 30 8 40 8C50 8 57 15 57 25V34" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    <rect x="14" y="31" width="52" height="41" rx="8" fill="currentColor" />
    <path d="M40 43C35 43 32 47 33 51C33 54 35 56 37 57V64H43V57C45 56 47 54 47 51C48 47 45 43 40 43Z" fill="white" opacity="0.32" />
  </svg>
);

// ===== LOVE LETTER =====
export const LoveLetterIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="20" width="64" height="48" rx="7" />
    <path d="M11 27L40 50L69 27M10 64L31 43M70 64L49 43" fill="none" stroke="white" strokeWidth="3" opacity="0.3" strokeLinejoin="round" />
    <path d="M40 23C34 14 21 18 23 28C25 36 40 43 40 43C40 43 55 36 57 28C59 18 46 14 40 23Z" />
  </svg>
);

// ===== CHOCOLATE =====
export const ChocolateIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="13" y="8" width="54" height="64" rx="6" />
    <path d="M31 9V71M49 9V71M14 29H66M14 50H66" stroke="white" strokeWidth="3" opacity="0.28" />
    <path d="M49 8H67V27L58 21L49 27V8Z" fill="white" opacity="0.24" />
  </svg>
);

// ===== COFFEE DATE =====
export const CoffeeIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 28H58V50C58 63 49 70 36 70C23 70 14 63 14 50V28Z" fill="currentColor" />
    <path d="M58 35H64C73 35 74 51 64 55H57" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M26 20C19 13 29 9 24 3M42 20C35 13 45 9 40 3" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.65" />
  </svg>
);

// ===== PERFUME =====
export const PerfumeIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="19" y="31" width="42" height="40" rx="10" />
    <rect x="31" y="18" width="18" height="15" rx="3" />
    <rect x="28" y="8" width="24" height="12" rx="4" />
    <path d="M40 43C35 36 25 42 28 50C30 57 40 62 40 62C40 62 50 57 52 50C55 42 45 36 40 43Z" fill="white" opacity="0.3" />
  </svg>
);

// ===== MIRROR =====
export const MirrorIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="40" cy="30" rx="24" ry="25" fill="currentColor" />
    <ellipse cx="40" cy="30" rx="17" ry="18" fill="white" opacity="0.18" />
    <path d="M40 55V72M28 73H52" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    <path d="M30 18L38 12" stroke="white" strokeWidth="3" opacity="0.45" strokeLinecap="round" />
  </svg>
);

// ===== CROWN =====
export const CrownIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 23L27 37L40 12L53 37L70 23L63 62H17L10 23Z" />
    <rect x="16" y="61" width="48" height="10" rx="4" />
    <circle cx="40" cy="45" r="5" fill="white" opacity="0.28" />
  </svg>
);

// ===== CONSTELLATION =====
export const ConstellationIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 58L30 22L47 48L66 13M30 22L66 13M47 48L65 68" stroke="currentColor" strokeWidth="2.5" opacity="0.45" />
    <circle cx="14" cy="58" r="7" fill="currentColor" /><circle cx="30" cy="22" r="6" fill="currentColor" /><circle cx="47" cy="48" r="8" fill="currentColor" /><circle cx="66" cy="13" r="5" fill="currentColor" /><circle cx="65" cy="68" r="6" fill="currentColor" />
  </svg>
);

// ===== PILLOW =====
export const PillowIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 13C22 17 58 17 68 13C64 25 64 55 68 67C55 63 25 63 12 67C16 54 16 26 12 13Z" />
    <path d="M40 32C34 24 23 30 25 40C27 49 40 56 40 56C40 56 53 49 55 40C57 30 46 24 40 32Z" fill="white" opacity="0.28" />
  </svg>
);

// ===== DATE LOCATION =====
export const DateLocationIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 74C40 74 14 48 14 29C14 14 25 6 40 6C55 6 66 14 66 29C66 48 40 74 40 74Z" />
    <path d="M40 23C35 15 23 21 26 31C28 39 40 45 40 45C40 45 52 39 54 31C57 21 45 15 40 23Z" fill="white" opacity="0.32" />
  </svg>
);

// ===== CLOCK =====
export const ClockIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="42" r="30" stroke="currentColor" strokeWidth="7" />
    <path d="M40 24V43L54 52M29 7H51" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ===== INFINITY =====
export const InfinityIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 40C31 27 24 21 16 22C5 23 3 39 10 49C18 61 31 52 40 40ZM40 40C49 27 56 21 64 22C75 23 77 39 70 49C62 61 49 52 40 40Z" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ===== CLASSIC BRA =====
export const BraIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 23V55M72 23V55M9 29C18 21 29 20 40 34C51 20 62 21 71 29" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    <path d="M9 29C9 50 18 60 31 55C37 53 40 45 40 34C40 45 43 53 49 55C62 60 71 50 71 29" fill="currentColor" />
    <path d="M10 58H70" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    <path d="M40 35V56" stroke="white" strokeWidth="2" opacity="0.3" />
  </svg>
);

// ===== LACE BRA =====
export const LaceBraIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 23V57M72 23V57M9 30C19 20 31 22 40 36C49 22 61 20 71 30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <path d="M9 30C10 49 20 59 32 54C37 51 39 44 40 36C41 44 43 51 48 54C60 59 70 49 71 30" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
    <path d="M11 58L17 53L23 58L29 53L35 58L41 53L47 58L53 53L59 58L65 53L71 58" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="27" cy="39" r="2" fill="currentColor" /><circle cx="53" cy="39" r="2" fill="currentColor" />
  </svg>
);

// ===== PANTIES =====
export const PantiesIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 20H72L65 49C62 61 54 68 45 68H35C26 68 18 61 15 49L8 20Z" />
    <path d="M9 29C25 35 55 35 71 29M40 34V66" stroke="white" strokeWidth="2.5" opacity="0.28" />
    <path d="M9 20L15 15L21 20L27 15L33 20L40 15L47 20L53 15L59 20L65 15L72 20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
  </svg>
);

// ===== THONG =====
export const ThongIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 21H72M11 23L40 67L69 23" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M31 45L40 66L49 45L40 36L31 45Z" fill="currentColor" />
    <path d="M16 21L21 17L26 21M54 21L59 17L64 21" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// ===== BOXER SHORTS =====
export const BoxerShortsIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 16H70L67 68H46L40 48L34 68H13L10 16Z" />
    <rect x="10" y="16" width="60" height="12" rx="3" fill="currentColor" />
    <path d="M40 17V48M16 28H64" stroke="white" strokeWidth="2.5" opacity="0.28" />
    <circle cx="40" cy="35" r="3" fill="white" opacity="0.3" />
  </svg>
);

// ===== MEN'S BRIEFS =====
export const MensBriefsIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 18H71L66 45C63 61 53 69 40 69C27 69 17 61 14 45L9 18Z" />
    <path d="M15 36C24 40 30 48 31 63M65 36C56 40 50 48 49 63M10 27H70" stroke="white" strokeWidth="3" opacity="0.27" />
  </svg>
);

// ===== CORSET =====
export const CorsetIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 7C27 12 53 12 62 7C57 27 58 53 66 72C50 67 30 67 14 72C22 53 23 27 18 7Z" />
    <path d="M31 13L49 65M49 13L31 65M24 20H56M21 55H59" stroke="white" strokeWidth="2.5" opacity="0.3" />
    <circle cx="29" cy="20" r="2" fill="currentColor" /><circle cx="51" cy="20" r="2" fill="currentColor" />
  </svg>
);

// ===== BODYSUIT =====
export const BodysuitIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 7L16 19L25 27L21 48C20 58 28 68 40 73C52 68 60 58 59 48L55 27L64 19L56 7L48 18H32L24 7Z" />
    <path d="M32 18C32 26 35 31 40 34C45 31 48 26 48 18M27 49C35 53 45 53 53 49" stroke="white" strokeWidth="2.5" opacity="0.28" />
  </svg>
);

// ===== STOCKINGS =====
export const StockingsIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 8H36L33 45C32 57 27 68 17 73C11 75 7 68 12 64L19 56L15 8Z" />
    <path d="M44 8H65L61 56L68 64C73 68 69 75 63 73C53 68 48 57 47 45L44 8Z" />
    <path d="M16 20H35M45 20H64" stroke="white" strokeWidth="3" opacity="0.3" />
  </svg>
);

// ===== GARTER BELT =====
export const GarterIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 18H68L63 36H17L12 18Z" fill="currentColor" />
    <path d="M23 36V67M57 36V67" stroke="currentColor" strokeWidth="5" />
    <rect x="14" y="61" width="20" height="10" rx="4" fill="currentColor" /><rect x="46" y="61" width="20" height="10" rx="4" fill="currentColor" />
    <path d="M20 18L27 24L34 18L40 24L46 18L53 24L60 18" stroke="white" strokeWidth="2" opacity="0.3" />
  </svg>
);

// ===== SATIN ROBE =====
export const RobeIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 8L9 22L18 36L23 31L17 72H63L57 31L62 36L71 22L56 8L47 20H33L24 8Z" />
    <path d="M33 20L45 40L30 72M47 20L35 40L50 72M20 46H60" stroke="white" strokeWidth="2.5" opacity="0.28" />
  </svg>
);

// ===== SHIRT =====
export const ShirtIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M26 8L8 19L15 36L24 31V72H56V31L65 36L72 19L54 8C50 15 46 18 40 18C34 18 30 15 26 8Z" />
    <path d="M40 18V71M31 12L40 22L49 12" stroke="white" strokeWidth="2.5" opacity="0.3" />
    <circle cx="40" cy="31" r="2" fill="white" opacity="0.35" /><circle cx="40" cy="42" r="2" fill="white" opacity="0.35" />
  </svg>
);

// ===== SKIRT =====
export const SkirtIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="24" y="10" width="32" height="13" rx="4" />
    <path d="M25 22H55L68 70H12L25 22Z" />
    <path d="M32 24L26 68M48 24L54 68" stroke="white" strokeWidth="2.5" opacity="0.25" />
  </svg>
);

// ===== SHORTS =====
export const ShortsIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 14H69L66 68H45L40 44L35 68H14L11 14Z" />
    <path d="M12 26H68M40 15V44M18 34L30 39M62 34L50 39" stroke="white" strokeWidth="2.5" opacity="0.28" />
  </svg>
);

// ===== FEMALE TORSO SILHOUETTE =====
export const FemaleTorsoIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M27 7C28 20 19 24 18 36C17 46 24 49 25 57C26 65 21 70 21 73M53 7C52 20 61 24 62 36C63 46 56 49 55 57C54 65 59 70 59 73" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M25 31C31 25 37 27 40 34C43 27 49 25 55 31M27 57C34 62 46 62 53 57" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// ===== MALE TORSO SILHOUETTE =====
export const MaleTorsoIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23 7C24 20 14 23 12 36C17 42 21 49 22 73M57 7C56 20 66 23 68 36C63 42 59 49 58 73M22 73H58" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 32C27 25 35 26 40 33C45 26 53 25 60 32M40 33V61M30 57C36 61 44 61 50 57" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.7" />
  </svg>
);

// ===== FEMALE HIPS =====
export const FemaleHipsIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M29 6C30 20 27 28 18 39C10 49 13 66 25 74M51 6C50 20 53 28 62 39C70 49 67 66 55 74" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    <path d="M20 39C29 46 51 46 60 39M25 73C33 66 47 66 55 73" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// ===== MALE HIPS =====
export const MaleHipsIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 7C26 23 20 32 16 43L22 73M55 7C54 23 60 32 64 43L58 73M22 73H58" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 42C30 47 50 47 62 42M31 47L40 58L49 47" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ===== BACK SILHOUETTE =====
export const BackSilhouetteIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M27 7C29 19 19 24 17 38C15 50 23 56 24 73M53 7C51 19 61 24 63 38C65 50 57 56 56 73" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M40 14V68M25 29C31 34 35 35 40 31C45 35 49 34 55 29M27 64C35 59 45 59 53 64" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.72" />
  </svg>
);

// ===== THIGH =====
export const ThighIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 7C24 26 19 40 16 55C14 66 20 74 29 72C37 70 38 60 39 50L42 30M55 7C56 26 61 40 64 55C66 66 60 74 51 72C43 70 42 60 41 50L38 30" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <path d="M23 21H57" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
  </svg>
);

// ===== COLLARBONE =====
export const CollarboneIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M29 7V20C29 26 24 29 15 33C9 36 7 45 7 56M51 7V20C51 26 56 29 65 33C71 36 73 45 73 56" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M16 35C25 36 32 39 40 47C48 39 55 36 64 35M40 47V70" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// ===== NAVEL / ABDOMEN =====
export const NavelIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M27 7C28 22 22 29 21 42C20 55 25 64 25 73M53 7C52 22 58 29 59 42C60 55 55 64 55 73" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M25 58C34 62 46 62 55 58" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <ellipse cx="40" cy="45" rx="5" ry="7" fill="currentColor" />
  </svg>
);

// ===== MOVIE CLAPPERBOARD =====
export const MovieClapperIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 28H69V66C69 69.3 66.3 72 63 72H17C13.7 72 11 69.3 11 66V28Z" fill="currentColor" />
    <path d="M10 16.5L66.5 7L70 23L13.5 32.5L10 16.5Z" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M23 14.8L32 28.8M42 11.6L51 25.6M60 8.6L69 22.6" stroke="white" strokeWidth="5" opacity="0.78" />
    <path d="M21 42H59M21 53H49" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.74" />
  </svg>
);

// ===== FILM REEL =====
export const FilmReelIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="38" cy="38" r="29" fill="currentColor" />
    <circle cx="38" cy="38" r="5" fill="white" opacity="0.9" />
    <circle cx="38" cy="20" r="8" fill="white" opacity="0.82" />
    <circle cx="55" cy="34" r="8" fill="white" opacity="0.82" />
    <circle cx="48" cy="53" r="8" fill="white" opacity="0.82" />
    <circle cx="27" cy="53" r="8" fill="white" opacity="0.82" />
    <circle cx="21" cy="33" r="8" fill="white" opacity="0.82" />
    <path d="M60 58C64 62 68 65 74 66" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

// ===== FILM STRIP =====
export const FilmStripIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="15" width="66" height="50" rx="7" fill="currentColor" />
    <rect x="18" y="25" width="20" height="30" rx="3" fill="white" opacity="0.86" />
    <rect x="42" y="25" width="20" height="30" rx="3" fill="white" opacity="0.62" />
    <path d="M13 21H18M27 21H32M41 21H46M55 21H60M64 21H68M13 59H18M27 59H32M41 59H46M55 59H60M64 59H68" stroke="white" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// ===== POPCORN =====
export const PopcornIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 30H63L58 72H22L17 30Z" fill="currentColor" />
    <path d="M31 32L33 69M49 32L47 69" stroke="white" strokeWidth="7" opacity="0.78" />
    <circle cx="23" cy="27" r="10" fill="currentColor" />
    <circle cx="35" cy="20" r="12" fill="currentColor" />
    <circle cx="48" cy="21" r="11" fill="currentColor" />
    <circle cx="59" cy="28" r="9" fill="currentColor" />
    <circle cx="40" cy="31" r="11" fill="currentColor" />
    <path d="M28 22C30 18 33 16 37 16M49 17C53 18 55 21 56 24" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.72" />
  </svg>
);

// ===== CINEMA TICKET =====
export const CinemaTicketIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 25C14 25 18 21 18 15H62C62 21 66 25 72 25V55C66 55 62 59 62 65H18C18 59 14 55 8 55V25Z" fill="currentColor" />
    <path d="M53 20V60" stroke="white" strokeWidth="3" strokeDasharray="5 5" opacity="0.72" />
    <path d="M25 29L43 40L25 51V29Z" fill="white" opacity="0.88" />
  </svg>
);

// ===== MOVIE PROJECTOR =====
export const ProjectorIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="26" width="51" height="36" rx="8" fill="currentColor" />
    <circle cx="24" cy="44" r="9" fill="white" opacity="0.78" />
    <circle cx="47" cy="36" r="4" fill="white" opacity="0.78" />
    <path d="M59 35L74 29V59L59 53V35Z" fill="currentColor" />
    <path d="M17 62L13 72M50 62L54 72" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

// ===== CINEMA SCREEN =====
export const CinemaScreenIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="10" width="66" height="47" rx="6" fill="currentColor" />
    <rect x="14" y="17" width="52" height="33" rx="3" fill="white" opacity="0.82" />
    <path d="M34 25L52 34L34 43V25Z" fill="currentColor" />
    <path d="M40 57V68M24 70H56" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

// ===== PLAY BUTTON =====
export const PlayCircleIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="33" fill="currentColor" />
    <path d="M33 24L58 40L33 56V24Z" fill="white" opacity="0.9" />
    <circle cx="40" cy="40" r="29" stroke="white" strokeWidth="2" opacity="0.35" />
  </svg>
);

// ===== MOVIE CAMERA =====
export const MovieCameraIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="21" r="12" fill="currentColor" />
    <circle cx="48" cy="20" r="11" fill="currentColor" />
    <circle cx="24" cy="21" r="4" fill="white" opacity="0.78" />
    <circle cx="48" cy="20" r="4" fill="white" opacity="0.78" />
    <rect x="10" y="32" width="50" height="31" rx="7" fill="currentColor" />
    <path d="M60 39L74 33V62L60 56V39Z" fill="currentColor" />
    <path d="M31 43L45 51L31 58V43Z" fill="white" opacity="0.8" />
  </svg>
);

// ===== 3D GLASSES =====
export const ThreeDGlassesIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 28H29C33 28 36 31 36 35V52C36 57 32 61 27 61H19C13 61 9 57 9 51L8 28ZM72 28H51C47 28 44 31 44 35V52C44 57 48 61 53 61H61C67 61 71 57 71 51L72 28Z" fill="currentColor" />
    <path d="M36 36C38 33 42 33 44 36M9 28L5 21M71 28L75 21" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M17 37H29M51 37H63" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.78" />
  </svg>
);

// ===== DIRECTOR CHAIR =====
export const DirectorChairIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="18" y="12" width="44" height="23" rx="5" fill="currentColor" />
    <path d="M21 35L59 70M59 35L21 70M16 42H64" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M27 22H53" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.75" />
  </svg>
);

// ===== MOVIE AWARD =====
export const MovieAwardIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 6L48 23L67 25L53 38L57 57L40 48L23 57L27 38L13 25L32 23L40 6Z" fill="currentColor" />
    <path d="M35 51H45V67H35V51ZM25 67H55V74H25V67Z" fill="currentColor" />
    <path d="M40 18V39M30 29H50" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.7" />
  </svg>
);

// ===== STREAMING TV =====
export const StreamingIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="17" width="66" height="46" rx="9" fill="currentColor" />
    <path d="M34 29L55 40L34 52V29Z" fill="white" opacity="0.9" />
    <path d="M29 72H51M40 63V72M30 7L40 17L50 7" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ===== CINEMA SEATS =====
export const CinemaSeatsIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="22" width="27" height="31" rx="9" fill="currentColor" />
    <rect x="44" y="22" width="27" height="31" rx="9" fill="currentColor" />
    <path d="M8 46H37V67H15C11 67 8 64 8 60V46ZM43 46H72V60C72 64 69 67 65 67H43V46Z" fill="currentColor" />
    <path d="M22 30V43M58 30V43" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
    <path d="M7 45H37M43 45H73" stroke="white" strokeWidth="3" opacity="0.55" />
  </svg>
);

// ===== COUPLE: EYE CONTACT =====
export const CoupleEyeContactIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 72V43C7 24 18 11 33 11C37 11 40 13 42 15C37 21 35 27 36 34L27 41L36 45C36 56 30 66 25 72H7Z" fill="currentColor" />
    <path d="M73 72V43C73 24 62 11 47 11C43 11 40 13 38 15C43 21 45 27 44 34L53 41L44 45C44 56 50 66 55 72H73Z" fill="currentColor" />
    <circle cx="31" cy="33" r="3" fill="white" opacity="0.88" />
    <circle cx="49" cy="33" r="3" fill="white" opacity="0.88" />
    <path d="M40 8C37 3 30 5 30 11C30 17 40 23 40 23C40 23 50 17 50 11C50 5 43 3 40 8Z" fill="white" opacity="0.78" />
    <path d="M34 32H37M43 32H46" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
  </svg>
);

// ===== COUPLE: FOREHEAD TOUCH =====
export const CoupleForeheadTouchIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 73V47C6 25 19 11 35 11C37 11 39 12 40 13C35 18 32 24 32 31L40 38L35 43C34 56 29 66 24 73H6Z" fill="currentColor" />
    <path d="M74 73V47C74 25 61 11 45 11C43 11 41 12 40 13C45 18 48 24 48 31L40 38L45 43C46 56 51 66 56 73H74Z" fill="currentColor" />
    <path d="M40 7C37 3 31 5 31 10C31 15 40 20 40 20C40 20 49 15 49 10C49 5 43 3 40 7Z" fill="white" opacity="0.88" />
    <path d="M30 54C34 50 38 49 40 53C42 49 46 50 50 54" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
  </svg>
);

// ===== COUPLE: BACK HUG =====
export const CoupleBackHugIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="48" cy="19" r="13" fill="currentColor" opacity="0.78" />
    <circle cx="34" cy="25" r="13" fill="currentColor" />
    <path d="M19 74V49C19 38 26 31 36 31H42C53 31 61 39 61 50V74H19Z" fill="currentColor" />
    <path d="M13 47C20 42 28 43 38 53C48 43 57 42 67 47M13 47C13 61 23 70 39 73M67 47C67 61 57 70 39 73" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    <path d="M35 51C38 47 43 47 46 51C43 57 40 59 40 59C40 59 37 57 35 51Z" fill="white" opacity="0.82" />
    <path d="M25 39C31 43 37 44 43 40" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
  </svg>
);

// ===== COUPLE: SIDE CUDDLE =====
export const CoupleSideCuddleIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="26" cy="26" r="13" fill="currentColor" />
    <circle cx="51" cy="31" r="12" fill="currentColor" opacity="0.82" />
    <path d="M10 73V51C10 40 17 34 27 34C36 34 42 39 42 49V73H10Z" fill="currentColor" />
    <path d="M39 73V53C39 44 45 39 54 39C64 39 70 46 70 56V73H39Z" fill="currentColor" opacity="0.82" />
    <path d="M19 43C30 37 43 43 53 52M20 44C24 56 34 64 48 67" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M43 42C47 38 52 39 55 42C52 47 47 47 43 42Z" fill="white" opacity="0.82" />
  </svg>
);

// ===== COUPLE: HEARTBEAT CUDDLE =====
export const CoupleHeartbeatCuddleIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="20" r="13" fill="currentColor" />
    <path d="M32 73V46C32 34 39 28 50 28C61 28 68 36 68 48V73H32Z" fill="currentColor" />
    <circle cx="27" cy="40" r="12" fill="currentColor" opacity="0.82" />
    <path d="M10 73V60C10 49 17 44 27 44C37 44 44 50 44 61V73H10Z" fill="currentColor" opacity="0.82" />
    <path d="M15 50C27 45 37 46 48 57C55 51 61 49 68 51" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M38 45H44L47 38L52 53L56 45H63" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
  </svg>
);

// ===== COUPLE: HOLDING HANDS =====
export const CoupleHoldingHandsIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="22" cy="14" r="10" fill="currentColor" />
    <circle cx="58" cy="14" r="10" fill="currentColor" />
    <path d="M11 72L14 34C15 27 19 24 23 24C28 24 31 28 31 34L30 51L24 72H11Z" fill="currentColor" />
    <path d="M69 72L66 34C65 27 61 24 57 24C52 24 49 28 49 34L50 51L56 72H69Z" fill="currentColor" />
    <path d="M28 36C32 42 35 46 40 48C45 46 48 42 52 36" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    <path d="M35 46C37 43 39 44 40 46C41 44 43 43 45 46C44 50 40 53 40 53C40 53 36 50 35 46Z" fill="white" opacity="0.9" />
    <path d="M17 72L22 52M63 72L58 52" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
  </svg>
);

// ===== COUPLE: ARM IN ARM =====
export const CoupleArmInArmIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="26" cy="14" r="10" fill="currentColor" />
    <circle cx="54" cy="14" r="10" fill="currentColor" opacity="0.82" />
    <path d="M15 72L18 35C19 27 23 24 28 24C34 24 37 29 37 36V51L31 72H15Z" fill="currentColor" />
    <path d="M65 72L62 35C61 27 57 24 52 24C46 24 43 29 43 36V51L49 72H65Z" fill="currentColor" opacity="0.82" />
    <path d="M30 34C35 38 38 42 40 48C42 42 45 38 50 34M21 72L27 54M59 72L53 54" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M37 46C39 43 41 43 43 46" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.82" />
  </svg>
);

// ===== COUPLE: SLOW DANCE =====
export const CoupleSlowDanceIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="18" r="11" fill="currentColor" />
    <circle cx="51" cy="18" r="11" fill="currentColor" opacity="0.82" />
    <path d="M17 74L22 38C23 30 28 27 34 28L41 35L48 28C55 27 60 31 61 39L65 74H17Z" fill="currentColor" />
    <path d="M22 37C14 31 13 23 18 17M59 37C67 31 67 23 62 17M18 17C24 12 30 12 36 16M62 17C56 12 50 12 44 16" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M27 45C35 51 46 51 54 43M30 74L36 54M53 74L47 54" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.58" />
    <path d="M38 32C40 29 42 29 44 32C42 36 41 37 41 37C41 37 39 36 38 32Z" fill="white" opacity="0.88" />
  </svg>
);

// ===== COUPLE: SELFIE =====
export const CoupleSelfieIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="29" cy="28" r="13" fill="currentColor" />
    <circle cx="49" cy="30" r="12" fill="currentColor" opacity="0.82" />
    <path d="M11 73V54C11 43 18 37 29 37C34 37 38 39 40 43C43 39 47 38 52 38C62 38 69 45 69 56V73H11Z" fill="currentColor" />
    <path d="M48 38C51 25 57 16 66 12" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <rect x="61" y="5" width="14" height="22" rx="3" fill="currentColor" />
    <circle cx="68" cy="9" r="2" fill="white" opacity="0.85" />
    <path d="M23 29C26 32 30 32 33 29M45 31C48 34 52 34 55 31" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.76" />
  </svg>
);

// ===== COUPLE: WHISPER =====
export const CoupleWhisperIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 73V43C7 24 18 11 33 11C37 11 40 13 42 16C37 21 35 27 36 34L28 40L36 44C36 55 30 66 25 73H7Z" fill="currentColor" />
    <path d="M73 73V43C73 24 62 11 48 11C44 11 41 13 39 16C44 21 46 27 45 34L54 40L45 44C45 55 51 66 56 73H73Z" fill="currentColor" opacity="0.82" />
    <path d="M29 40C36 38 41 35 47 30" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.78" />
    <path d="M27 43C32 44 36 43 40 40" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.62" />
    <path d="M52 28C59 28 61 34 59 40C57 44 54 46 50 45C47 44 47 40 50 38C53 36 53 33 50 32" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.82" />
  </svg>
);

// ===== COUPLE: FACE CARESS =====
export const CoupleFaceCaressIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 73V44C7 25 18 12 33 12C37 12 40 14 42 17C37 22 35 28 36 35L28 42L36 45C36 57 30 67 25 73H7Z" fill="currentColor" />
    <path d="M73 73V44C73 25 62 12 47 12C43 12 40 14 38 17C43 22 45 28 44 35L52 42L44 45C44 57 50 67 55 73H73Z" fill="currentColor" opacity="0.82" />
    <path d="M18 60C28 57 35 52 42 43" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    <path d="M39 42C43 38 47 39 50 42C47 47 43 47 39 42Z" fill="white" opacity="0.86" />
    <path d="M31 32C34 35 37 35 40 32M48 31H51" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.72" />
  </svg>
);

// ===== COUPLE: SHOULDER MASSAGE =====
export const CoupleShoulderMassageIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="48" cy="18" r="12" fill="currentColor" opacity="0.76" />
    <path d="M34 67V43C34 32 40 26 49 26C59 26 66 34 66 45V67H34Z" fill="currentColor" opacity="0.76" />
    <circle cx="32" cy="35" r="13" fill="currentColor" />
    <path d="M11 74V60C11 48 19 42 32 42C45 42 53 50 53 62V74H11Z" fill="currentColor" />
    <path d="M19 45C24 48 28 49 32 47M46 45C42 48 38 49 34 47" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.82" />
    <path d="M18 40L13 36M47 40L52 36" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M23 55C29 58 36 58 42 55" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.52" />
  </svg>
);

// ===== COUPLE: HAND CARE =====
export const CoupleHandCareIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="23" cy="17" r="10" fill="currentColor" />
    <circle cx="57" cy="17" r="10" fill="currentColor" opacity="0.82" />
    <path d="M10 60V39C10 31 15 27 23 27C31 27 35 32 35 40V60H10Z" fill="currentColor" />
    <path d="M70 60V39C70 31 65 27 57 27C49 27 45 32 45 40V60H70Z" fill="currentColor" opacity="0.82" />
    <path d="M9 54C21 49 31 50 40 58C49 50 59 49 71 54C61 65 51 70 40 72C29 70 19 65 9 54Z" fill="currentColor" />
    <path d="M34 56C37 52 39 53 40 55C41 53 43 52 46 56C44 61 40 64 40 64C40 64 36 61 34 56Z" fill="white" opacity="0.88" />
    <path d="M28 46L25 42M52 46L55 42" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.68" />
  </svg>
);

// ===== COUPLE: BACK CARESS =====
export const CoupleBackCaressIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="47" cy="17" r="12" fill="currentColor" opacity="0.76" />
    <path d="M34 72V42C34 31 40 25 49 25C60 25 67 33 67 45V72H34Z" fill="currentColor" opacity="0.76" />
    <circle cx="28" cy="26" r="13" fill="currentColor" />
    <path d="M10 72V50C10 39 18 33 29 33C40 33 47 41 47 52V72H10Z" fill="currentColor" />
    <path d="M55 42C49 47 44 53 40 63" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.86" />
    <path d="M57 38L62 42L58 47" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.68" />
    <path d="M19 46C27 49 34 48 40 43" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
  </svg>
);

// ===== COUPLE: FEEDING =====
export const CoupleFeedingIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="22" cy="27" r="13" fill="currentColor" />
    <circle cx="58" cy="27" r="13" fill="currentColor" opacity="0.82" />
    <path d="M6 73V55C6 43 13 37 23 37C34 37 40 44 40 56V73H6Z" fill="currentColor" />
    <path d="M74 73V55C74 43 67 37 57 37C46 37 40 44 40 56V73H74Z" fill="currentColor" opacity="0.82" />
    <path d="M20 50C29 44 38 39 50 34" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <ellipse cx="53" cy="32" rx="7" ry="4" transform="rotate(-24 53 32)" fill="currentColor" />
    <circle cx="57" cy="31" r="2.5" fill="white" opacity="0.88" />
    <path d="M17 28C20 31 24 31 27 28M52 29C55 32 59 32 62 29" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.68" />
  </svg>
);

// ===== COUPLE: STARGAZING =====
export const CoupleStargazingIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M63 6C55 9 50 16 50 25C50 35 58 43 68 43C71 43 74 42 76 41C73 49 65 54 56 54C44 54 34 44 34 32C34 20 44 10 56 10C59 10 61 9 63 6Z" fill="currentColor" opacity="0.66" />
    <path d="M13 16L15 11L17 16L22 18L17 20L15 25L13 20L8 18L13 16ZM29 8L31 4L33 8L37 10L33 12L31 16L29 12L25 10L29 8Z" fill="white" opacity="0.84" />
    <circle cx="27" cy="47" r="10" fill="currentColor" />
    <circle cx="46" cy="47" r="10" fill="currentColor" opacity="0.82" />
    <path d="M8 73V65C8 56 15 51 27 51C31 51 35 52 38 55C41 52 45 51 49 51C61 51 68 57 68 67V73H8Z" fill="currentColor" />
    <path d="M17 58C26 54 36 58 43 66C50 58 58 56 67 60" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
  </svg>
);

// ===== POSITION DECK: LUXURY SILHOUETTES =====
export const PositionOralIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="52" cy="21" r="11" fill="currentColor" opacity="0.86" />
    <path d="M37 70C38 48 42 34 54 30C66 34 71 47 70 70H37Z" fill="currentColor" opacity="0.82" />
    <circle cx="25" cy="49" r="9" fill="currentColor" />
    <path d="M8 70C12 59 19 54 29 56C36 57 41 62 44 70H8Z" fill="currentColor" />
    <path d="M27 40C35 35 40 30 43 24" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    <path d="M19 19L21 14L23 19L28 21L23 23L21 28L19 23L14 21L19 19Z" fill="white" opacity="0.84" />
    <path d="M9 73H72" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.48" />
  </svg>
);

export const PositionBlowjobIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 43C23 33 31 30 40 37C49 30 57 33 64 43C57 56 49 62 40 62C31 62 23 56 16 43Z" fill="currentColor" />
    <path d="M19 43C29 45 50 45 61 43" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
    <path d="M40 15L43 22L50 25L43 28L40 35L37 28L30 25L37 22L40 15Z" fill="white" opacity="0.84" />
    <path d="M13 22C19 16 25 14 31 17M67 22C61 16 55 14 49 17" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.58" />
    <circle cx="12" cy="48" r="3" fill="white" opacity="0.7" />
    <circle cx="68" cy="48" r="3" fill="white" opacity="0.7" />
  </svg>
);

export const PositionHandjobIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 48C22 39 29 33 35 24C38 20 44 22 43 27L39 37L54 28C59 25 63 31 59 35L45 49C39 56 34 63 29 70" fill="currentColor" />
    <path d="M67 48C58 39 51 33 45 24C42 20 36 22 37 27L41 37L26 28C21 25 17 31 21 35L35 49C41 56 46 63 51 70" fill="currentColor" opacity="0.7" />
    <path d="M40 49C33 43 27 48 29 54C31 60 40 65 40 65C40 65 49 60 51 54C53 48 47 43 40 49Z" fill="white" opacity="0.9" />
    <path d="M12 72H68" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
  </svg>
);

export const PositionFinalIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 5L47 14L59 12L61 24L72 30L66 41L72 52L61 58L59 70L47 68L40 77L33 68L21 70L19 58L8 52L14 41L8 30L19 24L21 12L33 14L40 5Z" fill="currentColor" opacity="0.3" />
    <circle cx="29" cy="29" r="9" fill="currentColor" />
    <circle cx="51" cy="29" r="9" fill="currentColor" opacity="0.78" />
    <path d="M16 66C17 48 22 39 31 39C36 39 39 43 40 49C41 43 44 39 49 39C58 39 63 48 64 66H16Z" fill="currentColor" />
    <path d="M25 44C31 48 36 53 40 62C44 53 49 48 55 44" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.88" />
    <path d="M37 20L40 13L43 20L50 23L43 26L40 33L37 26L30 23L37 20Z" fill="white" opacity="0.9" />
  </svg>
);

// Icon name to component mapping
const ICON_MAP: Record<string, React.FC<IconProps>> = {
  lips: LipsIcon,
  kiss: KissMarkIcon,
  kiss_cheek: KissCheekIcon,
  kiss_forehead: KissForeheadIcon,
  kiss_nose: KissNoseIcon,
  kiss_hand: KissHandIcon,
  kiss_neck: KissNeckIcon,
  kiss_shoulder: KissShoulderIcon,
  kiss_hair: KissHairIcon,
  kiss_air: KissAirIcon,
  kiss_lips: KissLipsIcon,
  kiss_hug: KissHugIcon,
  kiss_temple: KissTempleIcon,
  kiss_eyelid: KissEyelidIcon,
  kiss_ear: KissEarIcon,
  kiss_mistletoe: KissMistletoeIcon,
  kiss_surprise: KissSurpriseIcon,
  kiss_goodnight: KissGoodnightIcon,
  kiss_rain: KissRainIcon,
  heart: HeartIcon,
  flame: FlameIcon,
  hand: HandTouchIcon,
  eyes: EyesIcon,
  blindfold: BlindfoldIcon,
  dance: SexyDanceIcon,
  wine: WineGlassIcon,
  phone: PhoneIcon,
  massage: MassageIcon,
  hug: HugIcon,
  ear: EarWhisperIcon,
  feather: FeatherIcon,
  camera: CameraIcon,
  music: MusicIcon,
  sparkle: SparkleIcon,
  whisper: EarWhisperIcon,
  neck: NeckIcon,
  ice: IceCubeIcon,
  lap: LapSitIcon,
  hands: HandsTogetherIcon,
  button: ButtonUndoIcon,
  breath: HeartbeatIcon,
  playful_attention: PlayfulAttentionIcon,
  love_song_poem: LoveSongPoemIcon,
  music_perfume: MusicPerfumeIcon,
  romantic_outfit: RomanticOutfitIcon,
  body_kiss: BodyKissIcon,
  eyes_voice: EyesVoiceIcon,
  triple_kiss: TripleKissIcon,
  unbutton_back_caress: UnbuttonBackCaressIcon,
  blindfold_kiss: BlindfoldKissIcon,
  ice_back_trace: IceBackTraceIcon,
  collarbone_trace: CollarboneTraceIcon,
  lingerie: LingerieIcon,
  tongue: TongueIcon,
  couple: CoupleEmbraceIcon,
  couple_eye_contact: CoupleEyeContactIcon,
  couple_forehead_touch: CoupleForeheadTouchIcon,
  couple_back_hug: CoupleBackHugIcon,
  couple_side_cuddle: CoupleSideCuddleIcon,
  couple_heartbeat_cuddle: CoupleHeartbeatCuddleIcon,
  couple_holding_hands: CoupleHoldingHandsIcon,
  couple_arm_in_arm: CoupleArmInArmIcon,
  couple_slow_dance: CoupleSlowDanceIcon,
  couple_selfie: CoupleSelfieIcon,
  couple_whisper: CoupleWhisperIcon,
  couple_face_caress: CoupleFaceCaressIcon,
  couple_shoulder_massage: CoupleShoulderMassageIcon,
  couple_hand_care: CoupleHandCareIcon,
  couple_back_caress: CoupleBackCaressIcon,
  couple_feeding: CoupleFeedingIcon,
  couple_stargazing: CoupleStargazingIcon,
  heels: HighHeelsIcon,
  body: BodyCurvesIcon,
  handcuffs: HandcuffsIcon,
  dress: DressIcon,
  rose: RoseIcon,
  ring: RingIcon,
  gift: GiftIcon,
  moon: MoonIcon,
  candle: CandleIcon,
  key: KeyIcon,
  lock: LockIcon,
  letter: LoveLetterIcon,
  chocolate: ChocolateIcon,
  coffee: CoffeeIcon,
  perfume: PerfumeIcon,
  mirror: MirrorIcon,
  crown: CrownIcon,
  constellation: ConstellationIcon,
  pillow: PillowIcon,
  location: DateLocationIcon,
  clock: ClockIcon,
  infinity: InfinityIcon,
  bra: BraIcon,
  lace_bra: LaceBraIcon,
  panties: PantiesIcon,
  thong: ThongIcon,
  boxers: BoxerShortsIcon,
  briefs: MensBriefsIcon,
  corset: CorsetIcon,
  bodysuit: BodysuitIcon,
  stockings: StockingsIcon,
  garter: GarterIcon,
  robe: RobeIcon,
  shirt: ShirtIcon,
  skirt: SkirtIcon,
  shorts: ShortsIcon,
  female_torso: FemaleTorsoIcon,
  male_torso: MaleTorsoIcon,
  female_hips: FemaleHipsIcon,
  male_hips: MaleHipsIcon,
  back: BackSilhouetteIcon,
  thigh: ThighIcon,
  collarbone: CollarboneIcon,
  navel: NavelIcon,
  couple_embrace_art: CoupleEmbraceImageIcon,
  couple_reclining_art: CoupleRecliningImageIcon,
  couple_carry_art: CoupleStandingCarryImageIcon,
  couple_seated_art: CoupleSeatedGazeImageIcon,
  couple_lifted_kiss_art: CoupleLiftedKissImageIcon,
  couple_back_hug_kiss_art: CoupleBackHugKissImageIcon,
  couple_forehead_cuddle_art: CoupleForeheadCuddleImageIcon,
  couple_slow_dance_kiss_art: CoupleSlowDanceKissImageIcon,
  couple_sofa_cuddle_art: CoupleSofaCuddleImageIcon,
  couple_playful_spin_art: CouplePlayfulSpinImageIcon,
  couple_umbrella_kiss_art: CoupleUmbrellaKissImageIcon,
  movie_clapper: MovieClapperIcon,
  film_reel: FilmReelIcon,
  film_strip: FilmStripIcon,
  popcorn: PopcornIcon,
  cinema_ticket: CinemaTicketIcon,
  projector: ProjectorIcon,
  cinema_screen: CinemaScreenIcon,
  play: PlayCircleIcon,
  movie_camera: MovieCameraIcon,
  glasses_3d: ThreeDGlassesIcon,
  director_chair: DirectorChairIcon,
  movie_award: MovieAwardIcon,
  streaming: StreamingIcon,
  cinema_seats: CinemaSeatsIcon,
  position_oral: PositionOralIcon,
  position_blowjob: PositionBlowjobIcon,
  position_handjob: PositionHandjobIcon,
  position_final: PositionFinalIcon,
  position_have_sex_art: HaveSexMythicImageIcon,
};

/** Pictures behind the illustrated icons. */
const ICON_IMAGES: Record<string, string> = {
  couple_embrace_art: coupleEmbraceImage,
  couple_reclining_art: coupleRecliningImage,
  couple_carry_art: coupleStandingCarryImage,
  couple_seated_art: coupleSeatedGazeImage,
  couple_lifted_kiss_art: coupleLiftedKissImage,
  couple_back_hug_kiss_art: coupleBackHugKissImage,
  couple_forehead_cuddle_art: coupleForeheadCuddleImage,
  couple_slow_dance_kiss_art: coupleSlowDanceKissImage,
  couple_sofa_cuddle_art: coupleSofaCuddleImage,
  couple_playful_spin_art: couplePlayfulSpinImage,
  couple_umbrella_kiss_art: coupleUmbrellaKissImage,
  position_have_sex_art: haveSexMythicImage,
};

/** Loads and decodes a card's picture ahead of time, so turning it over never waits for it. */
export function preloadCardArt(card: { customImage?: string; icon?: string; content: string }): void {
  const source = card.customImage || ICON_IMAGES[card.icon || autoAssignIcon(card.content)];
  if (!source) return;
  const image = new Image();
  image.src = source;
  void image.decode?.().catch(() => undefined);
}

export const CARD_ICON_NAMES = Object.keys(ICON_MAP);

export function getCardIcon(iconName?: string): React.FC<IconProps> | null {
  if (!iconName) return null;
  return ICON_MAP[iconName] || null;
}

// Auto-assign icon based on card content keywords
export function autoAssignIcon(content: string): string {
  const lower = content.toLowerCase();
  const kissContext = lower.replace(/cầu hôn/g, '');
  const mentionsKiss = kissContext.includes('hôn') || lower.includes('môi');

  if ((lower.includes('ngốc nghếch') || lower.includes('tinh nghịch')) && lower.includes('chú ý')) return 'playful_attention';
  if ((lower.includes('trang phục') || lower.includes('kiểu tóc')) && lower.includes('cuốn hút')) return 'mirror';
  if (lower.includes('ngày hẹn hò mơ ước') || lower.includes('buổi hẹn hò mơ ước')) return 'location';
  if ((lower.includes('góc nghiêng') || lower.includes('đường nét')) && lower.includes('cơ thể')) return 'body';
  if ((lower.includes('bài hát') || lower.includes('bản nhạc') || lower.includes('âm nhạc')) && (lower.includes('mùi hương') || lower.includes('nước hoa'))) return 'music_perfume';
  if ((lower.includes('hát') || lower.includes('tình ca')) && (lower.includes('câu thơ') || lower.includes('đọc thơ'))) return 'love_song_poem';
  if (lower.includes('trang phục quyến rũ') || lower.includes('bộ đồ quyến rũ')) return 'romantic_outfit';
  if (mentionsKiss && (lower.includes('vị trí nào trên cơ thể') || lower.includes('vị trí trên cơ thể'))) return 'body_kiss';
  if (lower.includes('ánh mắt') && (lower.includes('giọng nói') || lower.includes('lời nói'))) return 'eyes_voice';
  if (mentionsKiss && (lower.includes('3 nụ hôn') || lower.includes('ba nụ hôn'))) return 'triple_kiss';
  if (mentionsKiss && lower.includes('bịt mắt')) return 'blindfold_kiss';
  if (lower.includes('cúc áo') && (lower.includes('vuốt') || lower.includes('chạm')) && lower.includes('lưng')) return 'unbutton_back_caress';
  if ((lower.includes('đá lạnh') || lower.includes('ngón tay ấm')) && lower.includes('sống lưng')) return 'ice_back_trace';
  if (lower.includes('xương đòn') && lower.includes('ngón tay')) return 'collarbone_trace';
  if (mentionsKiss && lower.includes('địa điểm')) return 'location';

  if (lower.includes('xoay một vòng') || lower.includes('bế xoay') || lower.includes('nhấc bổng xoay') || lower.includes('quay vòng')) return 'couple_playful_spin_art';
  if (mentionsKiss && (lower.includes('bế lên') || lower.includes('nhấc bổng') || lower.includes('ôm bổng') || lower.includes('bế trong tay'))) return 'couple_lifted_kiss_art';
  if (mentionsKiss && (lower.includes('ôm từ phía sau') || lower.includes('ôm sau lưng') || lower.includes('vòng tay từ sau'))) return 'couple_back_hug_kiss_art';
  if (((lower.includes('hôn trán') || lower.includes('thơm trán') || lower.includes('nụ hôn lên trán')) && (lower.includes('ôm') || lower.includes('vòng tay'))) || ((lower.includes('tựa trán') || lower.includes('áp trán') || lower.includes('chạm trán nhau')) && (lower.includes('ôm') || lower.includes('âu yếm')))) return 'couple_forehead_cuddle_art';
  if (mentionsKiss && (lower.includes('điệu nhảy chậm') || lower.includes('slow dance') || lower.includes('khiêu vũ'))) return 'couple_slow_dance_kiss_art';
  if ((lower.includes('sofa') || lower.includes('ghế dài') || lower.includes('đi-văng')) && (lower.includes('ôm') || lower.includes('âu yếm') || lower.includes('tựa vào nhau'))) return 'couple_sofa_cuddle_art';
  if (mentionsKiss && (lower.includes('dưới chiếc ô') || lower.includes('dưới ô') || lower.includes('che ô') || lower.includes('dưới dù') || lower.includes('che dù'))) return 'couple_umbrella_kiss_art';

  if (lower.includes('nhìn thẳng vào mắt') || lower.includes('nhìn sâu vào mắt') || lower.includes('giao tiếp bằng mắt')) return 'couple_eye_contact';
  if (lower.includes('tựa trán') || lower.includes('áp trán') || lower.includes('chạm trán nhau')) return 'couple_forehead_touch';
  if (lower.includes('ôm từ phía sau') || lower.includes('ôm sau lưng') || lower.includes('vòng tay từ sau')) return 'couple_back_hug';
  if (lower.includes('tựa đầu vào vai') || lower.includes('khoác vai') || lower.includes('ôm ngang vai')) return 'couple_side_cuddle';
  if (lower.includes('tựa vào ngực') || lower.includes('nghe nhịp tim') || lower.includes('áp tai lên ngực')) return 'couple_heartbeat_cuddle';
  if (lower.includes('nắm tay nhau') || lower.includes('đan các ngón tay') || lower.includes('tay trong tay')) return 'couple_holding_hands';
  if (lower.includes('khoác tay') || lower.includes('sánh bước') || lower.includes('đi dạo cùng nhau')) return 'couple_arm_in_arm';
  if (lower.includes('khiêu vũ nhẹ nhàng') || lower.includes('điệu nhảy chậm') || lower.includes('slow dance')) return 'couple_slow_dance';
  if (lower.includes('selfie thân mật') || lower.includes('selfie hai người') || lower.includes('ảnh đôi') || lower.includes('chụp hình cùng nhau')) return 'couple_selfie';
  if (lower.includes('thì thầm vào tai') || lower.includes('ghé tai') || lower.includes('nói nhỏ bên tai')) return 'couple_whisper';
  if (lower.includes('vuốt má') || lower.includes('chạm nhẹ lên khuôn mặt') || lower.includes('chạm khuôn mặt') || lower.includes('nâng cằm')) return 'couple_face_caress';
  if (lower.includes('mát-xa nhẹ vùng vai') || lower.includes('mát-xa vai') || lower.includes('massage vai') || lower.includes('bóp vai') || lower.includes('xoa vai')) return 'couple_shoulder_massage';
  if (lower.includes('mát-xa nhẹ nhàng hai bàn tay') || lower.includes('mát-xa tay') || lower.includes('xoa bàn tay') || lower.includes('vuốt các ngón tay')) return 'couple_hand_care';
  if (lower.includes('vuốt ve dịu dàng lưng') || lower.includes('vuốt lưng') || lower.includes('chạm lưng') || lower.includes('xoa lưng')) return 'couple_back_caress';
  if (lower.includes('đút cho') || lower.includes('đút đồ ăn') || lower.includes('cho nhau ăn')) return 'couple_feeding';
  if (lower.includes('ngắm sao') || lower.includes('ngắm trăng') || lower.includes('bầu trời đêm cùng nhau')) return 'couple_stargazing';
  if (mentionsKiss && (lower.includes('dưới mưa') || lower.includes('trong mưa'))) return 'kiss_rain';
  if (lower.includes('tầm gửi') || lower.includes('mistletoe')) return 'kiss_mistletoe';
  if (mentionsKiss && (lower.includes('chúc ngủ ngon') || lower.includes('trước khi ngủ') || lower.includes('goodnight'))) return 'kiss_goodnight';
  if (lower.includes('hôn má') || lower.includes('thơm má') || lower.includes('lên má') || lower.includes('đôi má') || lower.includes('gò má')) return 'kiss_cheek';
  if (lower.includes('hôn trán') || lower.includes('thơm trán') || lower.includes('lên trán') || lower.includes('chạm trán')) return 'kiss_forehead';
  if (lower.includes('hôn mí mắt') || lower.includes('hôn lên mắt') || lower.includes('hôn mắt') || lower.includes('thơm mắt')) return 'kiss_eyelid';
  if (mentionsKiss && (lower.includes('vành tai') || lower.includes('hôn tai') || lower.includes('thơm tai'))) return 'kiss_ear';
  if (lower.includes('hôn thái dương') || lower.includes('lên thái dương')) return 'kiss_temple';
  if (lower.includes('hôn mũi') || lower.includes('thơm mũi') || lower.includes('chạm mũi') || lower.includes('cọ mũi')) return 'kiss_nose';
  if (lower.includes('hôn tay') || lower.includes('thơm tay') || (mentionsKiss && lower.includes('mu bàn tay'))) return 'kiss_hand';
  if (mentionsKiss && (lower.includes('hôn cổ') || lower.includes('lên cổ') || lower.includes('vùng cổ'))) return 'kiss_neck';
  if (mentionsKiss && (lower.includes('hôn vai') || lower.includes('lên vai') || lower.includes('bờ vai'))) return 'kiss_shoulder';
  if (lower.includes('hôn tóc') || lower.includes('thơm tóc') || lower.includes('hôn đỉnh đầu') || lower.includes('lên đỉnh đầu')) return 'kiss_hair';
  if (lower.includes('hôn gió') || lower.includes('gửi nụ hôn') || lower.includes('thổi nụ hôn')) return 'kiss_air';
  if (mentionsKiss && (lower.includes('bất ngờ') || lower.includes('không đoán') || lower.includes('đột ngột'))) return 'kiss_surprise';
  if (mentionsKiss && (lower.includes('vừa ôm') || lower.includes('ôm và hôn') || lower.includes('hôn trong vòng tay') || lower.includes('kéo sát'))) return 'kiss_hug';
  if (lower.includes('hôn môi') || lower.includes('khóa môi') || lower.includes('chạm môi') || lower.includes('nụ hôn sâu') || lower.includes('kiểu pháp') || lower.includes('french kiss') || (mentionsKiss && (lower.includes('cháy bỏng') || lower.includes('nồng nàn') || lower.includes('đắm say')))) return 'kiss_lips';
  if (lower.includes('bắp rang') || lower.includes('bỏng ngô') || lower.includes('popcorn')) return 'popcorn';
  if (lower.includes('vé xem phim') || lower.includes('vé phim') || lower.includes('vé rạp')) return 'cinema_ticket';
  if (lower.includes('kính 3d') || lower.includes('phim 3d')) return 'glasses_3d';
  if (lower.includes('ghế đạo diễn') || lower.includes('đạo diễn')) return 'director_chair';
  if (lower.includes('máy chiếu') || lower.includes('projector')) return 'projector';
  if (lower.includes('máy quay') || lower.includes('quay phim')) return 'movie_camera';
  if (lower.includes('cuộn phim') || lower.includes('film reel')) return 'film_reel';
  if (lower.includes('thước phim') || lower.includes('dải phim') || lower.includes('film strip')) return 'film_strip';
  if (lower.includes('màn chiếu') || lower.includes('rạp chiếu') || lower.includes('rạp phim') || lower.includes('cinema')) return 'cinema_screen';
  if (lower.includes('ghế rạp') || lower.includes('hàng ghế')) return 'cinema_seats';
  if (lower.includes('giải thưởng điện ảnh') || lower.includes('tượng vàng') || lower.includes('giải phim')) return 'movie_award';
  if (lower.includes('xem trực tuyến') || lower.includes('streaming') || lower.includes('netflix')) return 'streaming';
  if (lower.includes('trailer') || lower.includes('nút phát') || lower.includes('phát phim')) return 'play';
  if (lower.includes('phim') || lower.includes('movie') || lower.includes('điện ảnh')) return 'movie_clapper';
  if (lower.includes('nằm ôm') || lower.includes('nằm cạnh') || lower.includes('nằm sát')) return 'couple_reclining_art';
  if (lower.includes('bế') || lower.includes('nhấc lên') || lower.includes('ôm đứng')) return 'couple_carry_art';
  if (lower.includes('ngồi đối diện') || lower.includes('ngồi sát nhau')) return 'couple_seated_art';
  if (lower.includes('áo ngực ren') || lower.includes('áo lót ren')) return 'lace_bra';
  if (lower.includes('áo ngực') || lower.includes('áo lót nữ') || lower.includes('bra')) return 'bra';
  if (lower.includes('quần lọt khe') || lower.includes('thong')) return 'thong';
  if (lower.includes('quần lót nữ') || lower.includes('panties')) return 'panties';
  if (lower.includes('quần boxer') || lower.includes('boxer')) return 'boxers';
  if (lower.includes('quần lót nam') || lower.includes('quần sịp')) return 'briefs';
  if (lower.includes('corset') || lower.includes('áo nịt ngực')) return 'corset';
  if (lower.includes('bodysuit') || lower.includes('áo liền thân')) return 'bodysuit';
  if (lower.includes('tất dài') || lower.includes('vớ dài')) return 'stockings';
  if (lower.includes('đai tất') || lower.includes('garter')) return 'garter';
  if (lower.includes('áo choàng') || lower.includes('áo ngủ')) return 'robe';
  if (lower.includes('áo sơ mi')) return 'shirt';
  if (lower.includes('chân váy') || lower.includes('váy ngắn')) return 'skirt';
  if (lower.includes('quần short') || lower.includes('quần ngắn')) return 'shorts';
  if (lower.includes('ngực nữ') || lower.includes('vòng một')) return 'female_torso';
  if (lower.includes('ngực nam') || lower.includes('cơ ngực')) return 'male_torso';
  if (lower.includes('hông nữ') || lower.includes('đường cong nữ')) return 'female_hips';
  if (lower.includes('hông nam') || lower.includes('v-line')) return 'male_hips';
  if (lower.includes('tấm lưng') || lower.includes('phần lưng')) return 'back';
  if (lower.includes('đùi') || lower.includes('bắp đùi')) return 'thigh';
  if (lower.includes('xương quai xanh') || lower.includes('xương đòn')) return 'collarbone';
  if (lower.includes('rốn') || lower.includes('vùng bụng')) return 'navel';
  if (lower.includes('hoa hồng') || lower.includes('bông hoa') || lower.includes('tặng hoa')) return 'rose';
  if (lower.includes('nhẫn') || lower.includes('cầu hôn') || lower.includes('đính hôn')) return 'ring';
  if (lower.includes('món quà') || lower.includes('tặng quà') || lower.includes('quà tặng')) return 'gift';
  if (lower.includes('ánh trăng') || lower.includes('trăng') || lower.includes('bầu trời đêm')) return 'moon';
  if (lower.includes('nến') || lower.includes('ánh nến')) return 'candle';
  if (lower.includes('chìa khóa')) return 'key';
  if (lower.includes('ổ khóa') || lower.includes('khóa trái tim')) return 'lock';
  if (lower.includes('lá thư') || lower.includes('thư tình') || lower.includes('viết thư')) return 'letter';
  if (lower.includes('socola') || lower.includes('sô-cô-la') || lower.includes('chocolate')) return 'chocolate';
  if (lower.includes('cà phê') || lower.includes('quán cafe') || lower.includes('quán cà phê')) return 'coffee';
  if (lower.includes('nước hoa') || lower.includes('mùi hương')) return 'perfume';
  if (lower.includes('soi gương') || lower.includes('chiếc gương')) return 'mirror';
  if (lower.includes('vương miện') || lower.includes('nữ hoàng') || lower.includes('hoàng tử')) return 'crown';
  if (lower.includes('ngôi sao') || lower.includes('chòm sao')) return 'constellation';
  if (lower.includes('gối') || lower.includes('trên giường')) return 'pillow';
  if (lower.includes('địa điểm') || lower.includes('nơi hẹn hò')) return 'location';
  if (lower.includes('đúng giờ') || lower.includes('thời gian') || lower.includes('bao lâu')) return 'clock';
  if (lower.includes('mãi mãi') || lower.includes('vĩnh cửu') || lower.includes('vô tận')) return 'infinity';
  if (mentionsKiss) return 'kiss';
  if (lower.includes('ôm') || lower.includes('ôm chặt')) return 'hug';
  if (lower.includes('bịt mắt') || lower.includes('nhắm mắt')) return 'blindfold';
  if (lower.includes('mắt') || lower.includes('nhìn') || lower.includes('ngắm')) return 'eyes';
  if (lower.includes('tai') || lower.includes('thì thầm') || lower.includes('vành tai')) return 'ear';
  if (lower.includes('cổ') || lower.includes('vai') || lower.includes('xương đòn')) return 'neck';
  if (lower.includes('khiêu vũ') || lower.includes('nhảy')) return 'dance';
  if (lower.includes('mát-xa') || lower.includes('massage')) return 'massage';
  if (lower.includes('ảnh') || lower.includes('selfie')) return 'camera';
  if (lower.includes('hát') || lower.includes('bài hát') || lower.includes('nhạc')) return 'music';
  if (lower.includes('tay') || lower.includes('ngón tay') || lower.includes('chạm')) return 'hand';
  if (lower.includes('tin nhắn') || lower.includes('điện thoại')) return 'phone';
  if (lower.includes('lòng') || lower.includes('đùi') || lower.includes('ngồi')) return 'lap';
  if (lower.includes('đá') || lower.includes('lạnh')) return 'ice';
  if (lower.includes('tháo') || lower.includes('cúc áo')) return 'button';
  if (lower.includes('trang phục') || lower.includes('mặc')) return 'dress';
  if (lower.includes('lưng') || lower.includes('sống lưng')) return 'body';
  if (lower.includes('nồng') || lower.includes('cháy') || lower.includes('cuồng')) return 'flame';
  if (lower.includes('yêu') || lower.includes('lãng mạn')) return 'heart';
  if (lower.includes('quyến rũ') || lower.includes('gợi cảm')) return 'sparkle';
  if (lower.includes('rượu') || lower.includes('nước') || lower.includes('đồ ăn')) return 'wine';

  return 'heart';
}
