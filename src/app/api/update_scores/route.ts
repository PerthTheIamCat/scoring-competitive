// app/api/update_scores/route.ts

import { NextResponse } from "next/server";
import { getSocket } from "@/lib/socketServer"; // module ที่ export ฟังก์ชัน getSocket()

// กำหนด type สำหรับคำถามและทีม
type Question = {
  score: number;
  time: string;
  isFirstSolve: boolean;
  status: "correct" | "pending" | "incorrect" | "none";
};

type Team = {
  team_name: string;
  questions: Question[];
  sum: number;
  previousRank: number;
  isMoving: boolean;
};

type QuestionDataProps = {
  score: number;
  time: string;
};

type DataProps = {
  team_name: string;
  questions: QuestionDataProps[]; // ข้อมูลที่รับมาจะเป็น "questions" (array)
  sum: number;
};

export async function POST(request: Request) {
  // รับข้อมูลจาก request body (คาดว่าข้อมูลเป็น array ของ DataProps)
  const body: DataProps[] = await request.json();
  console.log("Received data:", JSON.stringify(body));

  // แปลงข้อมูลจาก DataProps[] เป็น Team[]
  const teams: Team[] = body.map((team) => {
    const questions: Question[] = team.questions.map((q) => {
      const new_status: Question["status"] =
        q.score >= 100 ? "correct" : q.score > 0 ? "pending" : "none";
      return {
        score: q.score,
        time: q.time,
        isFirstSolve: false, // ค่าเริ่มต้น, จะปรับในขั้นตอน first solve
        status: new_status,
      };
    });
    return {
      team_name: team.team_name,
      questions,
      sum: team.sum,
      previousRank: 0,
      isMoving: false,
    };
  });

  // ค้นหาจำนวนคำถามสูงสุดในทุกทีม เพื่อวนลูปตาม index
  let maxQuestions = Math.max(...teams.map((team) => team.questions.length));

  // สำหรับแต่ละ index ของคำถาม (q) ให้ตรวจสอบกรณีที่ score ≥ 100
  // แล้วหาทีมที่มีเวลาที่ทำได้เร็วที่สุด (first solve)
  for (let q = 0; q < maxQuestions; q++) {
    let earliestTime: Date | null = null;
    let earliestTeamIndex: number | null = null;
    teams.forEach((team, index) => {
      if (team.questions.length > q) {
        const question = team.questions[q];
        if (question.score >= 100 && question.time.trim() !== "") {
          // เปลี่ยน format เวลาจาก "2025-02-27 20:16:05" เป็น "2025-02-27T20:16:05"
          const parsedTime = question.time.replace(" ", "T");
          const timeVal = new Date(parsedTime);
          if (!earliestTime || timeVal < earliestTime) {
            earliestTime = timeVal;
            earliestTeamIndex = index;
          }
        }
      }
    });
    // กำหนดให้เฉพาะทีมที่มีเวลาที่เร็วที่สุดใน index นี้ได้ isFirstSolve = true
    if (earliestTeamIndex !== null) {
      teams.forEach((team, index) => {
        if (team.questions.length > q) {
          team.questions[q].isFirstSolve = index === earliestTeamIndex;
        }
      });
    }
  }

  // คำนวณคะแนนรวมใหม่สำหรับแต่ละทีม (ถ้าต้องการให้แน่ใจว่า sum ถูกอัปเดต)
  teams.forEach((team) => {
    team.sum = team.questions.reduce((acc, q) => acc + q.score, 0);
  });

  // ส่งข้อมูลผ่าน WebSocket ด้วย instance ที่ได้จาก getSocket()
  try {
    const io = getSocket(); // getSocket() ควร return instance ของ Socket.IO server
    io.emit("update-score", { teams });
    console.log("Emitted update-score event via socket");
  } catch (err) {
    console.error("Error emitting socket event:", err);
  }

  return NextResponse.json({
    success: true,
    message: "Data processed and emitted via WS",
    teams,
  });
}
