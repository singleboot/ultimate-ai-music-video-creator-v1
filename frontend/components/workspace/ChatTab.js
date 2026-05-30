import ChatBot from '../shared/ChatBot';

export default function ChatTab({ onGenerate, disabled }) {
  return (
    <div className="h-full">
      <ChatBot onGenerate={onGenerate} disabled={disabled} />
    </div>
  );
}