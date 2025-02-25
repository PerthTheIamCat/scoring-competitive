"use client";

import { useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket;

type Question = {
  score: number;
  isFirstSolve: boolean;
  status: string;
};

type Team = {
  team_name: string;
  sum: number;
  previousRank: number;
  isMoving: boolean;
  [key: string]: string | number | boolean | Question;
};

export default function Admin() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamName, setTeamName] = useState<string>("");
  const [numProblems, setNumProblems] = useState<number>(0);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedTeamIndex, setSelectedTeamIndex] = useState<number | null>(
    null
  );
  const [selectedQuestionKey, setSelectedQuestionKey] = useState<string>("");
  const [editScore, setEditScore] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>("none");
  const [editIsFirstSolve, setEditIsFirstSolve] = useState<boolean>(false);

  const initializeSocket = () => {
    if (!socket) {
      socket = io({ path: "/api/socket" });
    }
  };

  const addTeam = () => {
    if (!teamName || numProblems <= 0) {
      alert("Please enter a valid team name and number of problems.");
      return;
    }

    const newTeam: Team = {
      team_name: teamName,
      sum: 0,
      previousRank: 0,
      isMoving: false,
    };

    for (let i = 1; i <= numProblems; i++) {
      newTeam[`questions${i}`] = {
        score: 0,
        isFirstSolve: false,
        status: "none",
      };
    }

    const updatedTeams = [...teams, newTeam];
    setTeams(updatedTeams);
    setTeamName("");
    setNumProblems(0);

    initializeSocket();
    socket.emit("update-score", { teams: updatedTeams });
  };

  const openEditModal = (
    teamIndex: number,
    questionKey: string,
    question: Question
  ) => {
    setSelectedTeamIndex(teamIndex);
    setSelectedQuestionKey(questionKey);
    setEditScore(question.score);
    setEditStatus(question.status);
    setEditIsFirstSolve(question.isFirstSolve);
    setShowModal(true);
  };

  const handleUpdateQuestion = () => {
    if (selectedTeamIndex === null || !selectedQuestionKey) return;

    const updatedTeams = [...teams];
    const team = updatedTeams[selectedTeamIndex];
    team[selectedQuestionKey] = {
      ...(team[selectedQuestionKey] as Question),
      score: editScore,
      status: editStatus,
      isFirstSolve: editIsFirstSolve,
    };

    team.sum = Object.entries(team)
      .filter(
        ([key, val]) =>
          key.startsWith("questions") &&
          typeof val === "object" &&
          val !== null &&
          "score" in val
      )
      .reduce((acc, [, val]) => acc + (val as Question).score, 0);

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
        <div className="row-span-9 overflow-y-auto p-4">
          {teams.map((team, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md py-4 mb-4 flex flex-row justify-around items-center"
            >
              <h3 className="text-2xl font-bold mb-2">
                #{index + 1} {team.team_name}
              </h3>
              <div className="list-disc flex gap-2">
                {Object.entries(team)
                  .filter(
                    ([key, value]) =>
                      key.startsWith("questions") &&
                      typeof value === "object" &&
                      value !== null &&
                      "score" in value
                  )
                  .map(([key, value]) => {
                    const question = value as Question;
                    return (
                      <div
                        key={key}
                        className={`bg-gray-100 py-2 px-4 rounded-xl cursor-pointer ${
                          question.score === 0
                            ? "bg-red-200"
                            : question.score > 0 && question.score < 100
                            ? "bg-yellow-200"
                            : "bg-green-200"
                        }`}
                        onClick={() => openEditModal(index, key, question)}
                      >
                        <p className="font-bold">Q{key.slice(-1)}:</p>
                        <p>Score: {question.score}</p>
                        <p>Status: {question.status}</p>
                        <p>
                          First Solve: {question.isFirstSolve ? "Yes" : "No"}
                        </p>
                      </div>
                    );
                  })}
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
              <input
                type="number"
                title="Score"
                placeholder="Enter Score"
                className="w-full border rounded-md px-3 py-2"
                value={editScore}
                onChange={(e) => setEditScore(Number(e.target.value))}
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2">Status:</label>
              <select
                className="w-full border rounded-md px-3 py-2"
                title="Select Status"
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
                title="First Solve"
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
