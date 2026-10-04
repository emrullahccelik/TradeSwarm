export class StreamingSentenceSplitter {
  private buffer = "";
  private sentenceCount = 0;
  private onSentence: (sentence: string, index: number) => void;

  constructor(onSentence: (sentence: string, index: number) => void) {
    this.onSentence = onSentence;
  }

  public feed(chunk: string): void {
    this.buffer += chunk;
    this.processBuffer();
  }

  public flush(): void {
    if (this.buffer.trim()) {
      this.emitSentence(this.buffer);
      this.buffer = "";
    }
  }

  private processBuffer(): void {
    let match;
    const isFirstSentence = this.sentenceCount === 0;
    
    const regexStr = isFirstSentence 
      ? "([.?!\\n,;:])\\s+"
      : "([.?!\\n])\\s+";
      
    const regex = new RegExp(regexStr, "g");

    while ((match = regex.exec(this.buffer)) !== null) {
      const possibleEnd = match.index;
      
      const beforeStr = this.buffer.slice(Math.max(0, possibleEnd - 10), possibleEnd);
      const afterStr = this.buffer.slice(possibleEnd + 1, Math.min(this.buffer.length, possibleEnd + 11));
      
      if (/\d$/.test(beforeStr) && /^\d/.test(afterStr.trim())) {
        continue;
      }

      const endIdx = match.index + match[0].length;
      const sentence = this.buffer.slice(0, endIdx);
      this.emitSentence(sentence);
      
      this.buffer = this.buffer.slice(endIdx);
      regex.lastIndex = 0; 
    }
  }

  private emitSentence(text: string): void {
    const cleaned = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/#/g, "")
      .replace(/`/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
      .trim();

    if (cleaned) {
      this.onSentence(cleaned, this.sentenceCount++);
    }
  }
}
