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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getCrownColor = (index: number) => {
    switch (index) {
      case 0:
        return 'text-yellow-500'; // Gold
      case 1:
        return 'text-gray-400'; // Silver
      case 2:
        return 'text-amber-600'; // Bronze
      default:
        return '';
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg w-[300px] z-10">
      <h2 className="text-xl font-bold mb-4 text-center">Top 5 Players</h2>
      <div className="space-y-3">
        {top5.map((entry, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-white/90 rounded hover:bg-white/100 transition-colors gap-2"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex items-center gap-1 flex-shrink-0">
                {index < 3 ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 ${getCrownColor(index)}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                ) : null}
                <span className="font-bold text-lg w-6 flex-shrink-0">{index + 1}.</span>
              </div>
              <img 
                src={entry.profile_image} 
                alt={entry.username}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
              <span className="font-medium truncate" title={entry.username}>{entry.username}</span>
            </div>
            <span className="font-bold flex-shrink-0 ml-2">{formatNumber(entry.high_score)}</span>
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