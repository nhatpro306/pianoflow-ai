import React from 'react';

export interface KeyboardProps {
  activeNotes?: Set<number>;
  expectedNotes?: Set<number>;
}

const isWhiteKey = (note: number) => {
  const pc = note % 12;
  return [0, 2, 4, 5, 7, 9, 11].includes(pc);
};

const MIN_NOTE = 21; // A0
const MAX_NOTE = 108; // C8

export function Keyboard({
  activeNotes = new Set(),
  expectedNotes = new Set(),
}: KeyboardProps) {
  const keys = [];
  for (let i = MIN_NOTE; i <= MAX_NOTE; i++) {
    keys.push(i);
  }

  let currentWhiteIndex = 0;
  const keyLayout = keys.map((note) => {
    const white = isWhiteKey(note);
    const layout = {
      note,
      white,
      whiteIndex: currentWhiteIndex,
    };
    if (white) {
      currentWhiteIndex++;
    }
    return layout;
  });

  return (
    <div className="w-full overflow-x-auto bg-zinc-100 p-4 rounded-lg shadow-inner select-none">
      <div className="relative flex w-max mx-auto shadow-xl rounded-b-md border-t-4 border-zinc-900">
        {/* White keys */}
        <div className="flex">
          {keyLayout
            .filter((k) => k.white)
            .map(({ note }) => {
              const isActive = activeNotes.has(note);
              const isExpected = expectedNotes.has(note);

              let bgClass = 'bg-white';
              if (isActive && isExpected) bgClass = 'bg-green-500';
              else if (isActive && !isExpected) bgClass = 'bg-red-500';
              else if (!isActive && isExpected) bgClass = 'bg-blue-400';

              return (
                <div
                  key={note}
                  className={`w-10 h-40 border-r border-b first:border-l border-zinc-300 rounded-b-md flex-shrink-0 transition-colors duration-75 ${bgClass}`}
                />
              );
            })}
        </div>

        {/* Black keys */}
        {keyLayout
          .filter((k) => !k.white)
          .map(({ note, whiteIndex }) => {
            const isActive = activeNotes.has(note);
            const isExpected = expectedNotes.has(note);

            let bgClass = 'bg-zinc-900';
            if (isActive && isExpected) bgClass = 'bg-green-600';
            else if (isActive && !isExpected) bgClass = 'bg-red-600';
            else if (!isActive && isExpected) bgClass = 'bg-blue-600';

            return (
              <div
                key={note}
                className={`absolute top-0 w-6 h-24 rounded-b-sm z-10 flex-shrink-0 transition-colors duration-75 shadow-md ${bgClass}`}
                style={{
                  left: `calc(${whiteIndex * 2.5}rem - 0.75rem)`,
                }}
              />
            );
          })}
      </div>
    </div>
  );
}

export default Keyboard;
