"use client";

import React, { useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket;

type Question = {
  score: number;
  isFirstSolve: boolean;
  status: string;
};

type Team = {
  team_name: string;
  questions: Question[]; // using an array for questions
  sum: number;
  previousRank: number;
  isMoving: boolean;
};

export default function Admin() {
  const [count, setCount] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isUnfreezing, setIsUnfreezing] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamName, setTeamName] = useState<string>("");
  const [numProblems, setNumProblems] = useState<number>(0);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedTeamIndex, setSelectedTeamIndex] = useState<number | null>(
    null
  );
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<
    number | null
  >(null);
  const [editScore, setEditScore] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>("none");
  const [editIsFirstSolve, setEditIsFirstSolve] = useState<boolean>(false);

  function handleUnfreeze() {
    if (!isFrozen) return;
    setIsFrozen(false);
    setIsUnfreezing(true);
  }

  function handleNext() {
    if (count < teams.length) {
      setCount(count + 1);
    } else {
      setCount(0);
      setIsUnfreezing(false);
    }
  }

  function handleFreeze() {
    setIsFrozen(true);
    setIsUnfreezing(false);
  }

  // Initialize the socket (if not already)
  const initializeSocket = () => {
    if (!socket) {
      socket = io({ path: "/api/socket" });
      console.log("Socket initialized:", socket);
    }
  };

  // New admin controls: emit WS events
  const handleAdminFreeze = () => {
    initializeSocket();
    console.log("Emitting admin-freeze event");
    socket.emit("admin-freeze", {}, (ackResponse: any) => {
      console.log("Admin freeze ack received:", ackResponse);
    });
    handleFreeze();
  };

  const handleAdminUnfreeze = () => {
    initializeSocket();
    console.log("Emitting admin-unfreeze event");
    socket.emit("admin-unfreeze", {}, (ackResponse: any) => {
      console.log("Admin unfreeze ack received:", ackResponse);
    });
    handleUnfreeze();
  };

  const handleAdminNext = () => {
    initializeSocket();
    console.log("Emitting admin-next event");
    socket.emit("admin-next", {}, (ackResponse: any) => {
      console.log("Admin next ack received:", ackResponse);
    });
    handleNext();
  };

  // Existing addTeam function
  const addTeam = () => {
    if (!teamName || numProblems <= 0) {
      alert("Please enter a valid team name and number of problems.");
      return;
    }

    const questions = Array(numProblems)
      .fill(null)
      .map(() => ({
        score: 0,
        isFirstSolve: false,
        status: "none",
      }));

    const newTeam: Team = {
      team_name: teamName,
      questions,
      sum: 0,
      previousRank: 0,
      isMoving: false,
    };

    const updatedTeams = [...teams, newTeam];
    setTeams(updatedTeams);
    setTeamName("");
    // Optionally reset numProblems here if desired:
    // setNumProblems(0);

    initializeSocket();
    socket.emit("update-score", { teams: updatedTeams }, (ackResponse: any) => {
      console.log("Add team ack received:", ackResponse);
    });
  };

  const openEditModal = (
    teamIndex: number,
    questionIndex: number,
    question: Question
  ) => {
    setSelectedTeamIndex(teamIndex);
    setSelectedQuestionIndex(questionIndex);
    setEditScore(question.score);
    setEditStatus(question.status);
    setEditIsFirstSolve(question.isFirstSolve);
    setShowModal(true);
  };

  const handleUpdateQuestion = () => {
    if (selectedTeamIndex === null || selectedQuestionIndex === null) return;

    const updatedTeams = [...teams];
    const team = updatedTeams[selectedTeamIndex];
    team.questions[selectedQuestionIndex] = {
      ...team.questions[selectedQuestionIndex],
      score: editScore,
      status: editStatus,
      isFirstSolve: editIsFirstSolve,
    };

    team.sum = team.questions.reduce((acc, q) => acc + q.score, 0);

    setTeams(updatedTeams);
    setShowModal(false);

    initializeSocket();
    socket.emit("update-score", { teams: updatedTeams });
  };

  return (
    <div className="bg-white h-screen w-full text-black">
      <div className="w-full h-full bg-green-100 grid grid-rows-12">
        <h1 className="text-4xl row-span-1 flex justify-center items-center">
          Admin Page
        </h1>
        <div className="row-span-2 flex justify-center items-center gap-4">
          <div className="w-[40%] bg-blue-100">
            <input
              type="text"
              className="text-gray px-5 py-3 text-xl w-full"
              placeholder="Team Name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>
          <div className="w-[10%]">
            <input
              type="number"
              className="text-gray px-5 py-3 text-l w-full"
              placeholder="Number Of Problems"
              value={numProblems}
              onChange={(e) => setNumProblems(Number(e.target.value))}
            />
          </div>
          <div className="w-[10%]">
            <button
              className="w-full bg-green-500 text-white px-5 py-3"
              onClick={addTeam}
            >
              Add Team
            </button>
          </div>
        </div>

        {/* New admin control buttons */}
        <div className="row-span-1 flex justify-center items-center gap-4 my-4">
          {!isFrozen && !isUnfreezing && (
            <button
              className="px-4 py-2 bg-red-500 text-white rounded"
              onClick={handleAdminFreeze}
            >
              Freeze Score 🛑
            </button>
          )}
          {isFrozen && (
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded"
              onClick={handleAdminUnfreeze}
            >
              Unfreeze Score ▶️
            </button>
          )}
          {isUnfreezing && (
            <button
              className="px-4 py-2 bg-green-500 text-white rounded"
              onClick={handleAdminNext}
            >
              Next ✅
            </button>
          )}
        </div>

        <div className="row-span-9 overflow-y-auto p-4">
          {teams.map((team, teamIndex) => (
            <div
              key={teamIndex}
              className="bg-white rounded-lg shadow-md py-4 mb-4 flex flex-row justify-around items-center"
            >
              <h3 className="text-2xl font-bold mb-2">
                #{teamIndex + 1} {team.team_name}
              </h3>
              <div className="flex gap-2">
                {team.questions.map((question, questionIndex) => (
                  <div
                    key={questionIndex}
                    className={`py-2 px-4 rounded-xl cursor-pointer ${
                      question.score === 0
                        ? "bg-red-200"
                        : question.score > 0 && question.score < 100
                        ? "bg-yellow-200"
                        : "bg-green-200"
                    }`}
                    onClick={() =>
                      openEditModal(teamIndex, questionIndex, question)
                    }
                  >
                    <p className="font-bold">Q{questionIndex + 1}:</p>
                    <p>Score: {question.score}</p>
                    <p>Status: {question.status}</p>
                    <p>First Solve: {question.isFirstSolve ? "Yes" : "No"}</p>
                  </div>
                ))}
              </div>
              <div>Sum: {team.sum}</div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-xl shadow-lg p-8 w-[400px]">
            <h2 className="text-2xl font-bold mb-4">Edit Question</h2>
            <div className="mb-4">
              <label className="block mb-2">Score:</label>
              {/* Stepper UI for numeric input */}
              <div className="flex items-center gap-2">
                <button
                  className="bg-gray-300 px-2 py-1 rounded"
                  onClick={() => setEditScore((prev) => Math.max(prev - 1, 0))}
                >
                  -
                </button>
                <input
                  type="text"
                  title="Score"
                  placeholder="Score"
                  className="w-16 border rounded-md text-center"
                  value={editScore}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val)) {
                      const num = Number(val);
                      setEditScore(num);
                      if (num === 100) {
                        setEditStatus("correct");
                      } else if (num === 0) {
                        setEditStatus("incorrect");
                      } else {
                        setEditStatus("pending");
                      }
                    }
                  }}
                />
                <button
                  className="bg-gray-300 px-2 py-1 rounded"
                  onClick={() => setEditScore((prev) => prev + 1)}
                >
                  +
                </button>
              </div>
            </div>
            <div className="mb-4">
              <label className="block mb-2">Status:</label>
              <select
                title="Status"
                aria-label="Question Status"
                className="w-full border rounded-md px-3 py-2"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <option value="none">None</option>
                <option value="pending">Pending</option>
                <option value="correct">Correct</option>
                <option value="incorrect">Incorrect</option>
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="editIsFirstSolve" className="block mb-2">
                First Solve:
              </label>
              <input
                id="editIsFirstSolve"
                type="checkbox"
                checked={editIsFirstSolve}
                onChange={(e) => setEditIsFirstSolve(e.target.checked)}
              />
            </div>
            <div className="flex justify-end gap-4">
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded-md"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-green-500 text-white px-4 py-2 rounded-md"
                onClick={handleUpdateQuestion}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
