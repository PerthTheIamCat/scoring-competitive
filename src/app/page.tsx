import { JSX } from "react";

type scoreProps = {
  team_name: string;
  score: number;
};

export default function Home() {
  const score: scoreProps[] = [
    {
      team_name: "Team A",
      score: 10,
    },
    {
      team_name: "Team B",
      score: 20,
    },
    {
      team_name: "Team C",
      score: 30,
    },
  ];
  return (
    <div className="flex flex-col w-full h-screen gap-5">
      {score.map((item: scoreProps, index: number): JSX.Element => {
        return (
          <div
            key={index}
            className="flex justify-between w-full h-20 bg-red-500"
          >
            <p>{item.team_name}</p>
            <p>{item.score}</p>
          </div>
        );
      })}
    </div>
  );
}
