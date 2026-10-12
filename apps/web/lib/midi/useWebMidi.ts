import { useState, useEffect, useCallback, useRef } from 'react';

export type MidiMessage = {
  command: number;
  channel: number;
  note: number;
  velocity: number;
  timestamp: number;
};

export interface UseWebMidiOptions {
  onNoteOn?: (note: number, velocity: number) => void;
  onNoteOff?: (note: number) => void;
}

export function useWebMidi(options?: UseWebMidiOptions) {
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null);
  const [inputs, setInputs] = useState<MIDIInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [messages] = useState<MidiMessage[]>([]);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let accessObj: MIDIAccess | null = null;
    let isMounted = true;

    if (typeof navigator !== 'undefined' && navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(
        (access) => {
          if (!isMounted) {
            access.onstatechange = null;
            return;
          }
          accessObj = access;
          setMidiAccess(access);
          const updateInputs = () => {
            if (!isMounted) return;
            const inputIterator = access.inputs.values();
            const inputsArray: MIDIInput[] = [];
            let nextInput = inputIterator.next();
            while (!nextInput.done) {
              inputsArray.push(nextInput.value);
              nextInput = inputIterator.next();
            }
            setInputs(inputsArray);
          };
          
          updateInputs();
          access.onstatechange = updateInputs;
        },
        (err) => {
          if (!isMounted) return;
          setError(`Web MIDI could not be initialized: ${err.message}`);
        }
      );
    } else {
      setError('Web MIDI is not supported in this browser.');
    }

    return () => {
      isMounted = false;
      if (accessObj) {
        accessObj.onstatechange = null;
      }
    };
  }, []);

  const handleMidiMessage = useCallback((event: Event) => {
    const midiEvent = event as MIDIMessageEvent;
    if (!midiEvent.data || midiEvent.data.length < 3) return;
    
    // Status byte: 1000nnnn (Note Off), 1001nnnn (Note On), 1011nnnn (Control Change)
    const statusByte = midiEvent.data[0];
    const command = statusByte >> 4;
    const note = midiEvent.data[1];
    const velocity = midiEvent.data[2];

    // Some keyboards send Note On with 0 velocity instead of Note Off
    const isNoteOff = command === 8 || (command === 9 && velocity === 0);
    const isNoteOn = command === 9 && velocity > 0;

    if (isNoteOn) {
      optionsRef.current?.onNoteOn?.(note, velocity);
    } else if (isNoteOff) {
      optionsRef.current?.onNoteOff?.(note);
    }

    setActiveNotes((prev) => {
      const exists = prev.has(note);
      if (isNoteOn && !exists) {
        const next = new Set(prev);
        next.add(note);
        return next;
      }
      if (isNoteOff && exists) {
        const next = new Set(prev);
        next.delete(note);
        return next;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    inputs.forEach((input) => {
      input.onmidimessage = handleMidiMessage;
    });

    return () => {
      inputs.forEach((input) => {
        input.onmidimessage = null;
      });
    };
  }, [inputs, handleMidiMessage]);

  return { midiAccess, inputs, messages, activeNotes, error };
}
