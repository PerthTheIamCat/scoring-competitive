"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";

type QuestionProps = {
  score: number;
  isFirstSolve: boolean;
  status?: "correct" | "pending" | "incorrect" | "none";
};

type ScoreProps = {
  team_name: string;
  questions1: QuestionProps;
  questions2: QuestionProps;
  questions3: QuestionProps;
  questions4: QuestionProps;
  questions5: QuestionProps;
  questions6: QuestionProps;
  questions7: QuestionProps;
  questions8: QuestionProps;
  sum: number;
  previousRank?: number;
  isMoving?: boolean;
  isHighlighting?: boolean;
};

const NUM_QUESTIONS = 8;

export default function Home() {
  const [scores, setScores] = useState<ScoreProps[]>([]);
  const [pendingScores, setPendingScores] = useState<ScoreProps[] | null>(null);
  const teamsToCheckRef = useRef<ScoreProps[]>([]);
  const socketRef = useRef<Socket | null>(null);
  // เก็บ snapshot ของคะแนนก่อน freeze
  const frozenScoresRef = useRef<ScoreProps[]>([]);

  const [isFrozen, setIsFrozen] = useState(false);
  const [isUnfreezing, setIsUnfreezing] = useState(false);
  const [currentCheckingIndex, setCurrentCheckingIndex] = useState<
    number | null
  >(null);
  const teamsToCheck = [...scores].reverse();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: "",
  });

  useEffect(() => {
    socketRef.current = io({
      path: "/api/socket",
      transports: ["websocket"],
    });

    socketRef.current.on("connect", () => {
      console.log("Connected to socket server with id:", socketRef.current?.id);
    });

    socketRef.current.on("score-updated", (updatedData) => {
      console.log("Received score update:", updatedData);
      if (!isFrozen) {
        handleScoreUpdate(updatedData.teams);
      } else {
        setPendingScores(updatedData.teams);
      }
    });

    socketRef.current.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("score-updated");
        socketRef.current.disconnect();
      }
    };
  }, [isFrozen]);

  function handleScoreUpdate(updatedTeams: ScoreProps[]) {
    setScores((prevScores) => {
      // ใช้ frozenScoresRef ถ้ามีข้อมูล snapshot จากก่อน freeze
      const oldScores =
        frozenScoresRef.current.length > 0
          ? frozenScoresRef.current
          : prevScores;
      const oldRanks = oldScores.reduce(
        (acc, team, index) => ({ ...acc, [team.team_name]: index + 1 }),
        {} as Record<string, number>
      );

      const sortedScores = [...updatedTeams].sort((a, b) => b.sum - a.sum);
      sortedScores.forEach((team, index) => {
        const oldRank = oldRanks[team.team_name] || index + 1;
        const newRank = index + 1;
        team.previousRank = oldRank;
        team.isMoving = oldRank !== newRank;
      });

      // เมื่ออัพเดทแบบปกติแล้วเคลียร์ frozen snapshot
      if (!isFrozen && frozenScoresRef.current.length > 0) {
        frozenScoresRef.current = [];
      }

      setTimeout(() => {
        setScores((prev) => prev.map((team) => ({ ...team, isMoving: false })));
      }, 1000);

      return sortedScores;
    });
  }

  // เมื่อกด Freeze ให้เก็บ snapshot ของ scores ก่อน freeze
  function handleFreeze() {
    frozenScoresRef.current = scores;
    setIsFrozen(true);
  }

  function handleNextCheck() {
    console.log(
      "handleNextCheck: currentCheckingIndex =",
      currentCheckingIndex,
      "teamsToCheck length =",
      teamsToCheckRef.current.length
    );

    if (
      currentCheckingIndex === null ||
      currentCheckingIndex >= teamsToCheckRef.current.length
    ) {
      // เมื่อเช็คครบทุกทีมแล้ว ให้รีเซ็ต flag และ snapshot
      setScores((prevScores) => {
        const sortedScores = [...prevScores].sort((a, b) => b.sum - a.sum);
        sortedScores.forEach((team, idx) => {
          team.previousRank = idx + 1;
          team.isMoving = false;
          team.isHighlighting = false;
        });
        return sortedScores;
      });
      console.log("Finalizing unfreezing: resetting flags and snapshots");
      frozenScoresRef.current = []; // เคลียร์ snapshot ของคะแนนก่อน freeze
      teamsToCheckRef.current = []; // เคลียร์ snapshot ของลำดับทีมที่ต้องเช็ค
      setIsUnfreezing(false);
      setCurrentCheckingIndex(null);
      return;
    }

    const team = teamsToCheckRef.current[currentCheckingIndex];

    const teamFirstSolveQuestions = Object.entries(team)
      .filter(
        ([key, value]) =>
          key.startsWith("questions") && (value as QuestionProps).isFirstSolve
      )
      .map(([key]) => key.replace("questions", "Q"));

    let pendingFirstSolveQuestions: string[] = [];
    if (pendingScores) {
      const pendingTeam = pendingScores.find(
        (t) => t.team_name === team.team_name
      );
      if (pendingTeam) {
        pendingFirstSolveQuestions = Object.entries(pendingTeam)
          .filter(
            ([key, value]) =>
              key.startsWith("questions") &&
              (value as QuestionProps).isFirstSolve
          )
          .map(([key]) => key.replace("questions", "Q"));
      }
    }

    // Merge and remove duplicates from both sources
    const firstSolveQuestions = Array.from(
      new Set([...teamFirstSolveQuestions, ...pendingFirstSolveQuestions])
    );

    if (firstSolveQuestions.length > 0) {
      setModalState({
        isOpen: true,
        message: `ทีม "${
          team.team_name
        }" ทำ First Solve ได้ในข้อ: ${firstSolveQuestions.join(", ")}`,
      });
      return;
    }

    processNextTeam(team);
  }

  function processNextTeam(team: ScoreProps) {
    if (pendingScores) {
      const updatedTeam = pendingScores.find(
        (t) => t.team_name === team.team_name
      );
      if (updatedTeam) {
        setScores((prevScores) => {
          // merge ข้อมูลใหม่เฉพาะทีมที่กำลังเช็ค
          const newScores = prevScores.map((t) =>
            t.team_name === team.team_name
              ? { ...t, ...updatedTeam, isHighlighting: true }
              : t
          );
          // คำนวณอันดับเก่า (สามารถใช้ frozenScoresRef หรือ prevScores เป็น snapshot ได้)
          const oldOrder =
            frozenScoresRef.current.length > 0
              ? frozenScoresRef.current
              : prevScores;
          const oldRanks = oldOrder.reduce((acc, t, idx) => {
            acc[t.team_name] = idx + 1;
            return acc;
          }, {} as Record<string, number>);
          // re-sort ใหม่ตาม sum
          const sortedScores = [...newScores].sort((a, b) => b.sum - a.sum);
          // คำนวณอันดับใหม่และ flag isMoving
          sortedScores.forEach((t, idx) => {
            const oldRank = oldRanks[t.team_name] || idx + 1;
            t.previousRank = oldRank;
            t.isMoving = oldRank !== idx + 1;
          });
          return sortedScores;
        });
      }
    }

    // แสดง highlight ของทีมที่กำลังตรวจสอบ
    setScores((prevScores) =>
      prevScores.map((t) =>
        t.team_name === team.team_name ? { ...t, isHighlighting: true } : t
      )
    );

    // หลังจาก delay 1 วินาทีให้ลบ highlight และเพิ่ม currentCheckingIndex
    setTimeout(() => {
      setScores((prevScores) =>
        prevScores.map((t) =>
          t.team_name === team.team_name ? { ...t, isHighlighting: false } : t
        )
      );
      setCurrentCheckingIndex((prev) => (prev !== null ? prev + 1 : null));
    }, 1000);
  }

  function handleUnfreeze() {
    if (!isFrozen) return;
    setIsFrozen(false);
    setIsUnfreezing(true);
    setCurrentCheckingIndex(0);
    // ไม่รีเฟรช scores ทันที
    if (pendingScores) {
      // เก็บ snapshot ของทีมที่ต้องอัปเดต (จาก pendingScores) ในลำดับจากล่างสุดขึ้นไป
      teamsToCheckRef.current = [...pendingScores].reverse();
    }
  }

  return (
    <div
      className={`flex flex-col items-center w-full h-screen gap-5 p-4 overflow-x-auto ${
        isFrozen ? "bg-blue-950" : ""
      }`}
    >
      <h1 className="text-4xl font-bold mb-5">🏆 Scoreboard Ranking 🏆</h1>

      <div className="flex gap-4 mb-5">
        <button
          className="px-4 py-2 bg-red-500 text-white rounded"
          onClick={handleFreeze}
        >
          Freeze Score 🛑
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded"
          onClick={handleUnfreeze}
          disabled={!isFrozen}
        >
          Unfreeze Score ▶️
        </button>
        {isUnfreezing && currentCheckingIndex !== null && (
          <button
            className="px-4 py-2 bg-green-500 text-white rounded"
            onClick={handleNextCheck}
          >
            Next ✅
          </button>
        )}
      </div>

      <div className="grid grid-cols-[auto,2fr,repeat(8,1fr),1fr] w-full min-w-[1024px] text-white text-lg bg-gray-700 p-4 rounded-lg font-bold">
        <p className="text-center pr-5">#</p>
        <p>Team Name</p>
        {Array.from({ length: NUM_QUESTIONS }, (_, i) => (
          <p key={i} className="text-center">
            Q{i + 1}
          </p>
        ))}
        <p className="text-center">Total</p>
      </div>

      <div className="w-full min-w-[1024px] flex flex-col gap-2">
        <AnimatePresence>
          {scores.map((item, index) => {
            // คำนวณอันดับเดิมจาก frozenScoresRef ถ้ามี
            const previousRank =
              frozenScoresRef.current.length > 0
                ? frozenScoresRef.current.findIndex(
                    (t) => t.team_name === item.team_name
                  ) + 1
                : item.previousRank;

            const bgColor = isUnfreezing
              ? item.isHighlighting
                ? "bg-blue-500"
                : "bg-gray-500"
              : item.isMoving
              ? previousRank && previousRank !== index + 1
                ? previousRank > index + 1
                  ? "bg-green-500"
                  : "bg-red-500"
                : "bg-gray-500"
              : "bg-gray-500";

            return (
              <motion.div
                key={item.team_name}
                layout
                transition={{
                  type: "spring",
                  stiffness: 50,
                  damping: 25,
                  duration: 3,
                }}
                className={`grid grid-cols-[auto,2fr,repeat(8,1fr),1fr] w-full h-16 text-white text-lg rounded-lg items-center p-4 shadow-md transition-colors duration-500 ${bgColor}`}
              >
                <p className="text-center font-bold pr-5">{index + 1}</p>
                <p>{item.team_name}</p>
                {Array.from({ length: NUM_QUESTIONS }, (_, i) => {
                  const key = `questions${i + 1}` as keyof ScoreProps;
                  const question = item[key] as QuestionProps;

                  if (question.isFirstSolve) {
                    return (
                      <div
                        key={i}
                        className="flex justify-center items-center text-xl"
                      >
                        🔥
                      </div>
                    );
                  }

                  const statusColor =
                    question.status === "correct"
                      ? "bg-green-500"
                      : question.status === "pending"
                      ? "bg-yellow-500"
                      : question.status === "incorrect"
                      ? "bg-red-500"
                      : "bg-transparent";

                  return (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded-full mx-auto ${statusColor}`}
                    ></div>
                  );
                })}
                <p className="text-center font-bold">{item.sum}</p>
              </motion.div>
            );
          })}
          {modalState.isOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="w-full h-full bg-black p-6 flex flex-col items-center justify-center rounded-lg shadow-2xl">
                <h2 className="text-9xl font-bold mb-4">
                  🎉 First Solve Alert!
                </h2>
                <p className="mb-4 text-4xl">{modalState.message}</p>
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                  onClick={() => {
                    setModalState({ isOpen: false, message: "" });
                    processNextTeam(
                      teamsToCheckRef.current[currentCheckingIndex!]
                    );
                  }}
                >
                  OK ✅
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
