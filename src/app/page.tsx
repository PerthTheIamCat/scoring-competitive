"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type QuestionProps = {
  score: number;
  isFirstSolve: boolean;
  status?: "correct" | "pending" | "incorrect";
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
  const [scores, setScores] = useState<ScoreProps[]>([
    {
      team_name: "Team A สูดไก่ใส่ไข่",
      questions1: { score: 5, isFirstSolve: true, status: "correct" },
      questions2: { score: 3, isFirstSolve: false },
      questions3: { score: 4, isFirstSolve: false, status: "incorrect" },
      questions4: { score: 6, isFirstSolve: false, status: "correct" },
      questions5: { score: 7, isFirstSolve: false, status: "pending" },
      questions6: { score: 8, isFirstSolve: false },
      questions7: { score: 9, isFirstSolve: false, status: "correct" },
      questions8: { score: 10, isFirstSolve: false },
      sum: 52,
      previousRank: 1,
      isMoving: false,
    },
    {
      team_name: "Team B เพิร์ธแอมป์ สลายบัก",
      questions1: { score: 4, isFirstSolve: false, status: "pending" },
      questions2: { score: 6, isFirstSolve: true, status: "correct" },
      questions3: { score: 5, isFirstSolve: true },
      questions4: { score: 7, isFirstSolve: true, status: "pending" },
      questions5: { score: 8, isFirstSolve: true, status: "correct" },
      questions6: { score: 5, isFirstSolve: true, status: "incorrect" },
      questions7: { score: 7, isFirstSolve: true },
      questions8: { score: 6, isFirstSolve: true },
      sum: 48,
      previousRank: 2,
      isMoving: false,
    },
    {
      team_name: "Team C โปรแกรมเมอร์เอง",
      questions1: { score: 3, isFirstSolve: false, status: "incorrect" },
      questions2: { score: 5, isFirstSolve: false, status: "correct" },
      questions3: { score: 6, isFirstSolve: false, status: "pending" },
      questions4: { score: 4, isFirstSolve: false, status: "incorrect" },
      questions5: { score: 6, isFirstSolve: false, status: "correct" },
      questions6: { score: 7, isFirstSolve: false, status: "pending" },
      questions7: { score: 8, isFirstSolve: false, status: "correct" },
      questions8: { score: 9, isFirstSolve: false, status: "pending" },
      sum: 48,
      previousRank: 3,
      isMoving: false,
    },
    {
      team_name: "Team D สามีสวย ภรรยาเท่",
      questions1: { score: 6, isFirstSolve: false, status: "correct" },
      questions2: { score: 4, isFirstSolve: false, status: "incorrect" },
      questions3: { score: 7, isFirstSolve: false, status: "correct" },
      questions4: { score: 5, isFirstSolve: false, status: "pending" },
      questions5: { score: 6, isFirstSolve: false, status: "correct" },
      questions6: { score: 8, isFirstSolve: false, status: "pending" },
      questions7: { score: 9, isFirstSolve: false, status: "correct" },
      questions8: { score: 10, isFirstSolve: false, status: "pending" },
      sum: 55,
      previousRank: 4,
      isMoving: false,
    },
    {
      team_name: "Team E ไอทีหมี ฟังเพลงเพราะ",
      questions1: { score: 7, isFirstSolve: false, status: "correct" },
      questions2: { score: 6, isFirstSolve: false, status: "pending" },
      questions3: { score: 5, isFirstSolve: false, status: "incorrect" },
      questions4: { score: 4, isFirstSolve: false, status: "incorrect" },
      questions5: { score: 3, isFirstSolve: false, status: "incorrect" },
      questions6: { score: 2, isFirstSolve: false, status: "incorrect" },
      questions7: { score: 1, isFirstSolve: false, status: "incorrect" },
      questions8: { score: 0, isFirstSolve: false, status: "incorrect" },
      sum: 28,
      previousRank: 5,
      isMoving: false,
    },
  ]);

  const [isFrozen, setIsFrozen] = useState(false);
  const [isUnfreezing, setIsUnfreezing] = useState(false);
  const [currentCheckingIndex, setCurrentCheckingIndex] = useState<
    number | null
  >(null);
  const teamsToCheck = [...scores].reverse(); // เช็คจากล่างขึ้นบน
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: "",
  });

  useEffect(() => {
    if (isFrozen || isUnfreezing) return;

    const interval = setInterval(() => {
      updateScores();
    }, 3000);

    return () => clearInterval(interval);
  }, [isFrozen, isUnfreezing]);

  function handleNextCheck() {
    if (
      currentCheckingIndex === null ||
      currentCheckingIndex >= teamsToCheck.length
    ) {
      setIsUnfreezing(false);
      setCurrentCheckingIndex(null);
      return;
    }

    const team = teamsToCheck[currentCheckingIndex];

    // 🔥 ตรวจสอบว่าทีมมี `isFirstSolve` อย่างน้อย 1 ข้อไหม
    const firstSolveQuestions = Object.entries(team)
      .filter(
        ([key, value]) =>
          key.startsWith("questions") && (value as QuestionProps).isFirstSolve
      )
      .map(([key]) => key.replace("questions", "Q"));

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
    // 🔵 ไฮไลต์ทีมที่กำลังเช็ค
    setScores((prevScores) =>
      prevScores.map((t) =>
        t.team_name === team.team_name ? { ...t, isHighlighting: true } : t
      )
    );

    setTimeout(() => {
      // ✅ อัปเดตคะแนน + รีเรียงอันดับ
      setScores((prevScores) => {
        const updatedScores = prevScores.map((t) => {
          if (t.team_name !== team.team_name) return t;

          let newSum = 0;
          const updatedTeam = { ...t };

          for (let i = 1; i <= NUM_QUESTIONS; i++) {
            const key = `questions${i}` as keyof ScoreProps;
            const newScore = Math.max(
              0,
              t[key].score + Math.floor(Math.random() * 6 - 3)
            );
            const newStatus =
              newScore > 7 ? "correct" : newScore > 3 ? "pending" : "incorrect";

            updatedTeam[key] = {
              ...t[key],
              score: newScore,
              status: newStatus,
            };
            newSum += newScore;
          }

          updatedTeam.sum = newSum;
          return updatedTeam;
        });

        return [...updatedScores].sort((a, b) => b.sum - a.sum);
      });

      // ✅ สีหายไปหลังจากกด `Next`
      setTimeout(() => {
        setScores((prevScores) =>
          prevScores.map((t) =>
            t.team_name === team.team_name ? { ...t, isHighlighting: false } : t
          )
        );

        setCurrentCheckingIndex((prev) => (prev !== null ? prev + 1 : null));
      }, 500);
    }, 1000);
  }

  function updateScores() {
    setScores((prevScores) => {
      const oldRanks = prevScores.reduce(
        (acc, team, index) => ({ ...acc, [team.team_name]: index + 1 }),
        {} as Record<string, number>
      );

      const updatedScores = prevScores.map((team) => {
        let newSum = 0;
        const updatedTeam = { ...team };

        for (let i = 1; i <= NUM_QUESTIONS; i++) {
          const key = `questions${i}` as keyof ScoreProps;
          const newScore = Math.max(
            0,
            team[key].score + Math.floor(Math.random() * 6 - 3)
          );
          const newStatus =
            newScore > 7 ? "correct" : newScore > 3 ? "pending" : "incorrect";

          updatedTeam[key] = {
            ...team[key],
            score: newScore,
            status: newStatus,
          };
          newSum += newScore;
        }

        updatedTeam.sum = newSum;
        return updatedTeam;
      });

      const sortedScores = [...updatedScores].sort((a, b) => b.sum - a.sum);
      sortedScores.forEach((team, index) => {
        const oldRank = oldRanks[team.team_name] || index + 1;
        const newRank = index + 1;
        team.previousRank = oldRank;
        team.isMoving = oldRank !== newRank;
      });

      // ให้สีกลับเป็นปกติหลังจาก 1 วินาที
      setTimeout(() => {
        setScores((prev) => prev.map((team) => ({ ...team, isMoving: false })));
      }, 1000);

      return sortedScores;
    });
  }

  function handleFreeze() {
    setIsFrozen(true);
  }

  function handleUnfreeze() {
    if (!isFrozen) return;
    setIsFrozen(false);
    setIsUnfreezing(true);
    setCurrentCheckingIndex(0); // เริ่มเช็คทีมแรก
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
        {isUnfreezing &&
          currentCheckingIndex !== null &&
          currentCheckingIndex < teamsToCheck.length && (
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
            const bgColor = isUnfreezing
              ? item.isHighlighting
                ? "bg-blue-500" // 🔵 กำลังตรวจสอบ
                : "bg-gray-500" // ⚪ ไม่มีสีแดง/เขียวระหว่าง `Unfreeze`
              : item.isMoving
              ? item.previousRank! - (index + 1) > 0
                ? "bg-green-500" // 🟢 อันดับขึ้น (กลับมาใช้หลัง Unfreeze)
                : "bg-red-500" // 🔴 อันดับลง (กลับมาใช้หลัง Unfreeze)
              : "bg-gray-500"; // ⚪ ปกติ

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
                className={`grid grid-cols-[auto,2fr,repeat(8,1fr),1fr] w-full h-16 text-white text-lg rounded-lg 
  items-center p-4 shadow-md transition-colors duration-500 ${bgColor}`}
              >
                <p className="text-center font-bold pr-5">{index + 1}</p>
                <p>{item.team_name}</p>
                {/* 🔥 เพิ่มส่วนแสดงคะแนนแต่ละข้อ */}
                {Array.from({ length: NUM_QUESTIONS }, (_, i) => {
                  const key = `questions${i + 1}` as keyof ScoreProps;
                  const question = item[key] as QuestionProps;

                  // ถ้า isFirstSolve เป็น true ให้แสดง 🔥 แทนที่วงกลม
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

                  // ถ้ามี status ให้แสดงสี ถ้าไม่มีให้โปร่งใส
                  const statusColor =
                    question.status === "correct"
                      ? "bg-green-500"
                      : question.status === "pending"
                      ? "bg-yellow-500"
                      : question.status === "incorrect"
                      ? "bg-red-500"
                      : "bg-transparent"; // ไม่มีสีถ้า status เป็น undefined

                  return (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded-full mx-auto ${statusColor}`}
                    ></div>
                  );
                })}
                <p className="text-center font-bold">{item.sum}</p>{" "}
                {/* ✅ ยังแสดงคะแนนรวมเหมือนเดิม */}
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
                    processNextTeam(teamsToCheck[currentCheckingIndex!]);
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
