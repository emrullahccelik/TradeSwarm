"use client";

import { createContext, useContext } from "react";

export interface SelectedArtifact {
  artifactId: string;
  version: number;
}

interface ArtifactPanelContextType {
  selected: SelectedArtifact | null;
  openArtifact: (artifact: SelectedArtifact) => void;
}

// Mesajlardaki artifact kartlarının yan paneli açabilmesi için; state ChatPanel'de tutulur
export const ArtifactPanelContext = createContext<ArtifactPanelContextType>({
  selected: null,
  openArtifact: () => {},
});

export function useArtifactPanel() {
  return useContext(ArtifactPanelContext);
}
