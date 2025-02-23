"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";

let socket: Socket;
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

  useEffect(() => {
    fetch("/api/socket");
    socket = io({ path: "/api/socket" });

    socket.on("score-updated", (updatedData) => {
      console.log("Received score update:", updatedData);
      handleScoreUpdate(updatedData.teams);
    });

    return () => {
      socket.off("score-updated");
    };
  }, []);

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

  function handleScoreUpdate(updatedTeams: ScoreProps[]) {
    setScores((prevScores) => {
      const oldRanks = prevScores.reduce(
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

      setTimeout(() => {
        setScores((prev) =>
          prev.map((team) => ({ ...team, isMoving: false }))
        );
      }, 1000);

      return sortedScores;
    });
  }

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

    const firstSolveQuestions = Object.entries(team)
      .filter(
        ([key, value]) =>
          key.startsWith("questions") && (value as QuestionProps).isFirstSolve
      )
      .map(([key]) => key.replace("questions", "Q"));

    if (firstSolveQuestions.length > 0) {
      setModalState({
        isOpen: true,
        message: `ทีม "${team.team_name}" ทำ First Solve ได้ในข้อ: ${firstSolveQuestions.join(", ")}`,
      });
      return;
    }

    processNextTeam(team);
  }

  function processNextTeam(team: ScoreProps) {
    setScores((prevScores) =>
      prevScores.map((t) =>
        t.team_name === team.team_name ? { ...t, isHighlighting: true } : t
      )
    );

    setTimeout(() => {
      setScores((prevScores) =>
        prevScores.map((t) =>
          t.team_name === team.team_name ? { ...t, isHighlighting: false } : t
        )
      );
      setCurrentCheckingIndex((prev) => (prev !== null ? prev + 1 : null));
    }, 1000);
  }

  function handleFreeze() {
    setIsFrozen(true);
  }

  function handleUnfreeze() {
    if (!isFrozen) return;
    setIsFrozen(false);
    setIsUnfreezing(true);
    setCurrentCheckingIndex(0);
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
                ? "bg-blue-500"
                : "bg-gray-500"
              : item.isMoving
              ? item.previousRank! - (index + 1) > 0
                ? "bg-green-500"
                : "bg-red-500"
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