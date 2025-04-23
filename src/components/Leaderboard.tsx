'use client';

interface LeaderboardEntry {
  username: string;
  profile_image: string;
  high_score: number;
}

interface LeaderboardProps {
  data: LeaderboardEntry[];
}

export default function Leaderboard({ data }: LeaderboardProps) {
  const top5 = data.slice(0, 5);
  console.log('Rendering leaderboard with data:', data);

  return (
    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg w-[300px] z-10">
      <h2 className="text-xl font-bold mb-4 text-center">Top 5 Players</h2>
      <div className="space-y-3">
        {top5.map((entry, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-white/90 rounded hover:bg-white/100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg w-6">{index + 1}.</span>
              <img 
                src={entry.profile_image} 
                alt={entry.username}
                className="w-8 h-8 rounded-full"
              />
              <span className="font-medium">{entry.username}</span>
            </div>
            <span className="font-bold">{entry.high_score}</span>
          </div>
        ))}
        {(!data || data.length === 0) && (
          <div className="text-center text-gray-500">
            No scores yet
          </div>
        )}
      </div>
    </div>
  );
} 