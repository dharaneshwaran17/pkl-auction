import type { PlayerRole } from "@prisma/client";
import { PKL_250_PLAYERS } from "./pkl250Players";

export const DEFAULT_INITIAL_PURSE = 100_000_000; // ₹10.00 Crores

// Real Pro Kabaddi League Franchises with official colors
export const FICTIONAL_TEAMS = [
  { name: "Tamil Thalaivas", colorPrimary: "#FDB913", colorSecondary: "#0A2540" },
  { name: "Puneri Paltan", colorPrimary: "#F26522", colorSecondary: "#FFC20E" },
  { name: "Bengaluru Bulls", colorPrimary: "#D2232A", colorSecondary: "#FFD204" },
  { name: "Patna Pirates", colorPrimary: "#0B6A38", colorSecondary: "#FFF200" },
  { name: "Jaipur Pink Panthers", colorPrimary: "#E91E63", colorSecondary: "#00BCD4" },
  { name: "Dabang Delhi K.C.", colorPrimary: "#1B365D", colorSecondary: "#E31B23" },
  { name: "U Mumba", colorPrimary: "#F37023", colorSecondary: "#231F20" },
  { name: "Bengal Warriorz", colorPrimary: "#1C75BC", colorSecondary: "#F58220" },
  { name: "Telugu Titans", colorPrimary: "#FFD100", colorSecondary: "#1A1A1A" },
  { name: "Gujarat Giants", colorPrimary: "#DA291C", colorSecondary: "#FF6A13" },
  { name: "Haryana Steelers", colorPrimary: "#0C2340", colorSecondary: "#EAAA00" },
  { name: "UP Yoddhas", colorPrimary: "#5C2D91", colorSecondary: "#ED1C24" },
] as const;

export type FictionalPlayer = {
  name: string;
  role: PlayerRole;
  rating: number;
  basePrice: number;
};

// 80 Authentic Pro Kabaddi League Stars
export const REAL_PKL_PLAYERS: FictionalPlayer[] = [
  // --- RAIDERS (32 Players) ---
  { name: "Pawan Sehrawat (Hi-Flyer)", role: "raider", rating: 96, basePrice: 3_000_000 },
  { name: "Pardeep Narwal (Record Breaker)", role: "raider", rating: 94, basePrice: 3_000_000 },
  { name: "Naveen Kumar (Naveen Express)", role: "raider", rating: 95, basePrice: 3_000_000 },
  { name: "Arjun Deshwal (Raid Machine)", role: "raider", rating: 95, basePrice: 3_000_000 },
  { name: "Maninder Singh (Mighty Mani)", role: "raider", rating: 93, basePrice: 3_000_000 },
  { name: "Sachin Tanwar (Do-or-Die Master)", role: "raider", rating: 92, basePrice: 3_000_000 },
  { name: "Ashu Malik", role: "raider", rating: 92, basePrice: 3_000_000 },
  { name: "Aslam Inamdar", role: "raider", rating: 91, basePrice: 2_000_000 },
  { name: "Bharat Hooda", role: "raider", rating: 90, basePrice: 2_000_000 },
  { name: "Guman Singh", role: "raider", rating: 89, basePrice: 2_000_000 },
  { name: "Surender Gill", role: "raider", rating: 89, basePrice: 2_000_000 },
  { name: "Vikash Kandola", role: "raider", rating: 88, basePrice: 2_000_000 },
  { name: "Narender Kandola", role: "raider", rating: 88, basePrice: 2_000_000 },
  { name: "Devank Dalal", role: "raider", rating: 88, basePrice: 1_300_000 },
  { name: "Siddharth Desai (Bahubali)", role: "raider", rating: 87, basePrice: 2_000_000 },
  { name: "Manjeet Dahiya", role: "raider", rating: 86, basePrice: 2_000_000 },
  { name: "Ajit Chouhan", role: "raider", rating: 86, basePrice: 1_300_000 },
  { name: "Pankaj Mohite", role: "raider", rating: 86, basePrice: 1_300_000 },
  { name: "Shivam Patare", role: "raider", rating: 85, basePrice: 1_300_000 },
  { name: "Prateek Dahiya", role: "raider", rating: 85, basePrice: 1_300_000 },
  { name: "Rakesh Sungroya", role: "raider", rating: 85, basePrice: 1_300_000 },
  { name: "Nitin Kumar", role: "raider", rating: 85, basePrice: 1_300_000 },
  { name: "Meetu Sharma", role: "raider", rating: 84, basePrice: 1_300_000 },
  { name: "Vinay", role: "raider", rating: 84, basePrice: 1_300_000 },
  { name: "Ayan Lohchab", role: "raider", rating: 84, basePrice: 900_000 },
  { name: "Bhavani Rajput", role: "raider", rating: 83, basePrice: 1_300_000 },
  { name: "Chandran Ranjit", role: "raider", rating: 82, basePrice: 1_300_000 },
  { name: "Jai Bhagwan", role: "raider", rating: 82, basePrice: 900_000 },
  { name: "Sushil Kambrekar", role: "raider", rating: 81, basePrice: 900_000 },
  { name: "Parteek", role: "raider", rating: 81, basePrice: 900_000 },
  { name: "Himanshu Narwal", role: "raider", rating: 80, basePrice: 900_000 },
  { name: "Shubham Shelke", role: "raider", rating: 79, basePrice: 900_000 },

  // --- DEFENDERS (32 Players) ---
  { name: "Mohammadreza Shadloui (Left Corner)", role: "defender", rating: 97, basePrice: 3_000_000 },
  { name: "Fazel Atrachali (Sultan - Left Corner)", role: "defender", rating: 96, basePrice: 3_000_000 },
  { name: "Sunil Kumar (Right Cover)", role: "defender", rating: 93, basePrice: 3_000_000 },
  { name: "Sagar Rathee (Right Corner)", role: "defender", rating: 93, basePrice: 3_000_000 },
  { name: "Sumit Sangwan (Left Corner)", role: "defender", rating: 92, basePrice: 3_000_000 },
  { name: "Jaideep Dahiya (Left Cover)", role: "defender", rating: 92, basePrice: 2_000_000 },
  { name: "Surjeet Singh (Right Cover)", role: "defender", rating: 91, basePrice: 2_000_000 },
  { name: "Saurabh Nandal (Right Corner)", role: "defender", rating: 91, basePrice: 2_000_000 },
  { name: "Gaurav Khatri (Right Corner)", role: "defender", rating: 91, basePrice: 2_000_000 },
  { name: "Krishan Dhull (Right Corner)", role: "defender", rating: 90, basePrice: 2_000_000 },
  { name: "Yogesh Dahiya (Right Corner)", role: "defender", rating: 90, basePrice: 2_000_000 },
  { name: "Rinku Sharma (Right Corner)", role: "defender", rating: 89, basePrice: 2_000_000 },
  { name: "Parvesh Bhainswal (Left Cover)", role: "defender", rating: 89, basePrice: 2_000_000 },
  { name: "Mohit Nandal (Right Cover)", role: "defender", rating: 89, basePrice: 2_000_000 },
  { name: "Rahul Sethpal (Right Corner)", role: "defender", rating: 89, basePrice: 2_000_000 },
  { name: "Nitesh Kumar (Right Corner)", role: "defender", rating: 89, basePrice: 2_000_000 },
  { name: "Vishal Bhardwaj (Left Corner)", role: "defender", rating: 88, basePrice: 2_000_000 },
  { name: "Aman (Left Corner)", role: "defender", rating: 88, basePrice: 1_300_000 },
  { name: "Abinesh Nadarajan (Right Cover)", role: "defender", rating: 88, basePrice: 1_300_000 },
  { name: "Shubham Shinde (Right Corner)", role: "defender", rating: 88, basePrice: 1_300_000 },
  { name: "Mahender Singh (The Bulldozer)", role: "defender", rating: 87, basePrice: 2_000_000 },
  { name: "Nitin Rawal (Left Corner)", role: "defender", rating: 87, basePrice: 2_000_000 },
  { name: "Sanket Sawant (Left Cover)", role: "defender", rating: 86, basePrice: 1_300_000 },
  { name: "Sombir (Right Corner)", role: "defender", rating: 86, basePrice: 1_300_000 },
  { name: "Ashish Malik (Left Corner)", role: "defender", rating: 85, basePrice: 1_300_000 },
  { name: "Sandeep Dhull (Left Corner)", role: "defender", rating: 85, basePrice: 1_300_000 },
  { name: "Mohit Khaler (Left Corner)", role: "defender", rating: 84, basePrice: 900_000 },
  { name: "Rinku Narwal (Left Corner)", role: "defender", rating: 83, basePrice: 900_000 },
  { name: "Milad Jabbari (Right Cover)", role: "defender", rating: 83, basePrice: 900_000 },
  { name: "Akshay Kumar (Left Cover)", role: "defender", rating: 82, basePrice: 900_000 },
  { name: "Rohit Kumar (Right Cover)", role: "defender", rating: 81, basePrice: 900_000 },
  { name: "Ravi Kumar (Right Cover)", role: "defender", rating: 80, basePrice: 900_000 },

  // --- ALL-ROUNDERS (16 Players) ---
  { name: "Amirmohammad Zafardanesh", role: "allRounder", rating: 92, basePrice: 3_000_000 },
  { name: "Mohit Goyat", role: "allRounder", rating: 91, basePrice: 3_000_000 },
  { name: "Vijay Malik", role: "allRounder", rating: 89, basePrice: 2_000_000 },
  { name: "Sandeep Narwal (The Beast)", role: "allRounder", rating: 89, basePrice: 2_000_000 },
  { name: "Deepak Niwas Hooda", role: "allRounder", rating: 88, basePrice: 2_000_000 },
  { name: "Mohammad Nabibakhsh", role: "allRounder", rating: 88, basePrice: 2_000_000 },
  { name: "Rohit Gulia", role: "allRounder", rating: 87, basePrice: 2_000_000 },
  { name: "Reza Mirbagheri", role: "allRounder", rating: 87, basePrice: 2_000_000 },
  { name: "Jitender Yadav", role: "allRounder", rating: 86, basePrice: 1_300_000 },
  { name: "Arkam Shaikh", role: "allRounder", rating: 85, basePrice: 1_300_000 },
  { name: "Neeraj Narwal", role: "allRounder", rating: 85, basePrice: 1_300_000 },
  { name: "Gurdeep", role: "allRounder", rating: 84, basePrice: 1_300_000 },
  { name: "Sachin Narwal", role: "allRounder", rating: 83, basePrice: 900_000 },
  { name: "Visvanath V", role: "allRounder", rating: 82, basePrice: 900_000 },
  { name: "Pranay Rane", role: "allRounder", rating: 82, basePrice: 900_000 },
  { name: "Rohit Raghav", role: "allRounder", rating: 81, basePrice: 900_000 },
];

export function buildFictionalPlayers(): FictionalPlayer[] {
  return PKL_250_PLAYERS.map((p) => ({
    name: p.name,
    role: p.role,
    rating: p.rating,
    basePrice: p.basePrice,
  }));
}

export function auctionCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
