export default function BotStatus() {
  return (
    <div className="border border-green-800 bg-green-950/10 p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] uppercase tracking-widest text-green-500">Bot Uplink</span>
        <span className="text-xs text-green-400 animate-pulse">ONLINE</span>
      </div>
      <div className="text-[10px] text-green-500/80 uppercase tracking-wider leading-5">
        Telegram API remains connected.
        <br />
        Awaiting external commands.
      </div>
    </div>
  );
}
