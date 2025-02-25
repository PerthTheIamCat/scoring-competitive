"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";

type QuestionProps = {
  score: number;
  isFirstSolve: boolean;
  status?: "correct" | "pending" | "incorrect" | "none";
};

const NUM_QUESTIONS = 8; // Change this value to adjust the number of questions

// Team now holds a questions array instead of separate keys.
type ScoreProps = {
  team_name: string;
  questions: QuestionProps[];
  sum: number;
  previousRank?: number;
  isMoving?: boolean;
  isHighlighting?: boolean;
};

export default function Home() {
  const [scores, setScores] = useState<ScoreProps[]>([]);
  const [pendingScores, setPendingScores] = useState<ScoreProps[] | null>(null);
  const teamsToCheckRef = useRef<ScoreProps[]>([]);
  const socketRef = useRef<Socket | null>(null);
  // Snapshot of scores before freeze
  const frozenScoresRef = useRef<ScoreProps[]>([]);

  const [isFrozen, setIsFrozen] = useState(false);
  const [isUnfreezing, setIsUnfreezing] = useState(false);
  const [currentCheckingIndex, setCurrentCheckingIndex] = useState<
    number | null
  >(null);
  const currentCheckingIndexRef = useRef<number | null>(null);
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

    socketRef.current.on("score-updated", (updatedData, ack) => {
      console.log("Received score update:", updatedData);
      if (!isFrozen) {
        handleScoreUpdate(updatedData.teams);
      } else {
        setPendingScores(updatedData.teams);
      }
      if (ack) ack({ received: true });
    });

    // Listen for admin events emitted from the Admin page
    socketRef.current.on("admin-freeze", (data, ack) => {
      console.log(
        "Admin freeze event received on client",
        socketRef.current?.id
      );
      handleFreeze(); // Call your local freeze function
      if (ack) ack({ received: true });
    });
    socketRef.current.on("admin-unfreeze", (data, ack) => {
      console.log(
        "Admin unfreeze event received on client",
        socketRef.current?.id
      );
      handleUnfreeze(); // Call your local unfreeze function
      if (ack) ack({ received: true });
    });
    socketRef.current.on("admin-next", (data, ack) => {
      console.log("Admin next event received on client", socketRef.current?.id);
      handleNextCheck(); // Call your local next function
      if (ack) ack({ received: true });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("score-updated");
        socketRef.current.off("admin-freeze");
        socketRef.current.off("admin-unfreeze");
        socketRef.current.off("admin-next");
        socketRef.current.disconnect();
      }
    };
  }, [isFrozen]);

  function handleScoreUpdate(updatedTeams: ScoreProps[]) {
    setScores((prevScores) => {
      // Use frozen snapshot if available
      const oldScores =
        frozenScoresRef.current.length > 0
          ? frozenScoresRef.current
          : prevScores;
      const oldRanks = oldScores.reduce((acc, team, index) => {
        acc[team.team_name] = index + 1;
        return acc;
      }, {} as Record<string, number>);

      const sortedScores = [...updatedTeams].sort((a, b) => b.sum - a.sum);
      sortedScores.forEach((team, index) => {
        const oldRank = oldRanks[team.team_name] || index + 1;
        team.previousRank = oldRank;
        team.isMoving = oldRank !== index + 1;
      });

      // Clear snapshot if not frozen
      if (!isFrozen && frozenScoresRef.current.length > 0) {
        frozenScoresRef.current = [];
      }

      setTimeout(() => {
        setScores((prev) => prev.map((team) => ({ ...team, isMoving: false })));
      }, 1000);

      return sortedScores;
    });
  }

  // Freeze: store snapshot of current scores
  function handleFreeze() {
    frozenScoresRef.current = scores;
    setIsFrozen(true);
  }

  function handleNextCheck() {
    // Use the ref value instead of the state variable directly
    const currentIndex = currentCheckingIndexRef.current;
    console.log(
      "handleNextCheck: currentCheckingIndex =",
      currentIndex,
      "teamsToCheck length =",
      teamsToCheckRef.current.length
    );

    if (
      currentIndex === null ||
      currentIndex >= teamsToCheckRef.current.length
    ) {
      // All teams have been checked: reset flags and snapshots
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
      frozenScoresRef.current = [];
      teamsToCheckRef.current = [];
      setIsUnfreezing(false);
      setCurrentCheckingIndex(null);
      currentCheckingIndexRef.current = null;
      return;
    }

    const team = teamsToCheckRef.current[currentIndex];

    // Check for first-solve in this team's questions
    const teamFirstSolveQuestions = team.questions
      .map((q, i) => (q.isFirstSolve ? `Q${i + 1}` : ""))
      .filter(Boolean);

    let pendingFirstSolveQuestions: string[] = [];
    if (pendingScores) {
      const pendingTeam = pendingScores.find(
        (t) => t.team_name === team.team_name
      );
      if (pendingTeam) {
        pendingFirstSolveQuestions = pendingTeam.questions
          .map((q, i) => (q.isFirstSolve ? `Q${i + 1}` : ""))
          .filter(Boolean);
      }
    }

    // Merge and remove duplicates
    const firstSolveQuestions = Array.from(
      new Set([...teamFirstSolveQuestions, ...pendingFirstSolveQuestions])
    );

    if (firstSolveQuestions.length > 0) {
      setModalState({
        isOpen: true,
        message: `Team "${
          team.team_name
        }" got first-solve on: ${firstSolveQuestions.join(", ")}`,
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
          const newScores = prevScores.map((t) =>
            t.team_name === team.team_name
              ? { ...t, ...updatedTeam, isHighlighting: true }
              : t
          );
          const oldOrder =
            frozenScoresRef.current.length > 0
              ? frozenScoresRef.current
              : prevScores;
          const oldRanks = oldOrder.reduce((acc, t, idx) => {
            acc[t.team_name] = idx + 1;
            return acc;
          }, {} as Record<string, number>);
          const sortedScores = [...newScores].sort((a, b) => b.sum - a.sum);
          sortedScores.forEach((t, idx) => {
            const oldRank = oldRanks[t.team_name] || idx + 1;
            t.previousRank = oldRank;
            t.isMoving = oldRank !== idx + 1;
          });
          return sortedScores;
        });
      }
    }

    // Highlight the team currently being checked
    setScores((prevScores) =>
      prevScores.map((t) =>
        t.team_name === team.team_name ? { ...t, isHighlighting: true } : t
      )
    );

    // After a delay, remove the highlight and increment the checking index
    setTimeout(() => {
      setScores((prevScores) =>
        prevScores.map((t) =>
          t.team_name === team.team_name ? { ...t, isHighlighting: false } : t
        )
      );
      // Use functional update and update the ref as well
      setCurrentCheckingIndex((prev) => {
        const newIndex = prev !== null ? prev + 1 : null;
        currentCheckingIndexRef.current = newIndex;
        return newIndex;
      });
    }, 1000);
  }

  function handleUnfreeze() {
    if (!isFrozen) return;
    setIsFrozen(false);
    setIsUnfreezing(true);
    setCurrentCheckingIndex(0);
    currentCheckingIndexRef.current = 0;
    if (pendingScores) {
      teamsToCheckRef.current = [...scores].reverse();
    }
  }
  function handleOK() {
    setModalState({ isOpen: false, message: "" });
    processNextTeam(teamsToCheckRef.current[currentCheckingIndex!]);
  }

  return (
    <div
      className={`flex flex-col items-center w-full h-screen gap-5 p-4 overflow-x-auto ${
        isFrozen ? "bg-blue-950" : ""
      }`}
    >
      <h1 className="text-4xl font-bold mb-5">🏆 Scoreboard Ranking 🏆</h1>

      {/* Optionally, you can keep local controls here as well */}
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

      <div
        className={`grid grid-cols-[auto,2fr,repeat(${NUM_QUESTIONS},1fr),1fr] w-full min-w-[1024px] text-white text-lg bg-gray-700 p-4 rounded-lg font-bold`}
      >
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
                className={`grid grid-cols-[auto,2fr,repeat(${NUM_QUESTIONS},1fr),1fr] w-full h-16 text-white text-lg rounded-lg items-center p-4 shadow-md transition-colors duration-500 ${bgColor}`}
              >
                <p className="text-center font-bold pr-5">{index + 1}</p>
                <p>{item.team_name}</p>
                {item.questions.map((question, i) => {
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
                  onClick={handleOK}
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
