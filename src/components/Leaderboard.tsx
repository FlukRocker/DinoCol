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
  const lastPlace = data.length > 0 ? data[data.length - 1] : null;
  const lastPlacePosition = data.length;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getRankEmoji = (index: number) => {
    switch (index) {
      case 0:
        return '🏆'; // Gold trophy
      case 1:
        return '🥈'; // Silver medal
      case 2:
        return '🥉'; // Bronze medal
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg w-[300px] p-4">
      <h2 className="text-xl font-bold mb-4 text-center">Top 5 Players</h2>
      <div className="space-y-2">
        {top5.map((entry, index) => (
          <div
            key={index}
            className="flex items-center gap-2"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-bold text-lg min-w-[25px]">
                {getRankEmoji(index)}{index + 1}.
              </span>
              <img 
                src={entry.profile_image} 
                alt={entry.username}
                className="w-6 h-6 rounded-full"
              />
              <span className="font-medium truncate text-sm" title={entry.username}>
                {entry.username}
              </span>
            </div>
            <span className="font-bold text-sm">{formatNumber(entry.high_score)}</span>
          </div>
        ))}

        {/* Last Place Player */}
        {lastPlace && data.length > 5 && (
          <>
            <div className="relative border-t border-black my-4">
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-2 text-sm">
                Our loser
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-bold text-lg min-w-[25px]">
                  💩{lastPlacePosition}.
                </span>
                <img 
                  src={lastPlace.profile_image} 
                  alt={lastPlace.username}
                  className="w-6 h-6 rounded-full"
                />
                <span className="font-medium truncate text-sm" title={lastPlace.username}>
                  {lastPlace.username}
                </span>
              </div>
              <span className="font-bold text-sm">{formatNumber(lastPlace.high_score)}</span>
            </div>
          </>
        )}

        {(!data || data.length === 0) && (
          <div className="text-center text-gray-500">
            No scores yet
          </div>
        )}
      </div>
    </div>
  );
} 