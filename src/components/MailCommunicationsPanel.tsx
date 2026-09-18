import React, { useState, useEffect } from 'react';
import { Mail, Send, CheckCheck, Clock, ShieldAlert, Sparkles, RefreshCw, Reply, User, ArrowUpRight } from 'lucide-react';
import { EmailMessage } from '../types';

interface MailCommunicationsPanelProps {
  emails: EmailMessage[];
  onReplyEmail: (emailId: string, replyText: string) => void;
  onSendNewEmail: (to: string, subject: string, body: string) => void;
  onMarkRead: (emailId: string) => void;
  onRefreshMail: () => void;
  isProcessing?: boolean;
}

export const INITIAL_EMAILS: EmailMessage[] = [
  {
    id: 'mail_1',
    sender: 'Pepper Potts',
    senderEmail: 'p.potts@starkindustries.com',
    subject: 'URGENT: Stark Board Meeting & Clean Energy Grid',
    snippet: 'Tony, the board is reconvening at 14:00. We need your sign-off on the Arc Reactor energy distribution figures.',
    body: 'Tony,\n\nThe board of directors is reconvening at 14:00 regarding the city-wide clean energy grid rollout. Wall Street analysts are already speculating on the quarterly numbers. Please review the attached energy distribution telemetry and confirm whether we are presenting the Mark VII capacity metrics.\n\nBest,\nPepper',
    timestamp: Date.now() - 1000 * 60 * 12, // 12 mins ago
    read: false,
    priority: 'urgent',
    draftReply: 'Pepper, confirmed for 14:00. The Mark VII capacity figures show 99.4% efficiency. JARVIS has packaged the telemetry dossier for the board.',
    status: 'received',
  },
  {
    id: 'mail_2',
    sender: 'Dr. Bruce Banner',
    senderEmail: 'b.banner@avengers-compound.org',
    subject: 'Gamma Spectral Analysis & Particle Containment',
    snippet: 'Ran the particle simulation with JARVIS core algorithms. Quantum fluctuations dropped by 42%.',
    body: 'Tony,\n\nFollowing up on our late-night calibration run. The neural dampening fields you suggested stabilized the chamber. Radiative leakage is zero. Check the telemetry stream when you get a chance.\n\n- Bruce',
    timestamp: Date.now() - 1000 * 60 * 48, // 48 mins ago
    read: false,
    priority: 'high',
    draftReply: 'Bruce, impressive work. JARVIS will monitor the isotopic decay continuously. Keep the containment field at 85%.',
    status: 'received',
  },
  {
    id: 'mail_3',
    sender: 'Col. James Rhodes',
    senderEmail: 'rhodey@dod.mil',
    subject: 'Avionics Firmware Patch & War Machine Uplink',
    snippet: 'Need the latest repulsor stabilization patch before the training sortie at Edwards AFB tomorrow.',
    body: 'Tony,\n\nThe avionics HUD in the suit threw a minor gyro sync alert during trans-sonic flight yesterday. Can JARVIS push the latest firmware update to the encrypted DOD relay before 0800 tomorrow?\n\nRhodey',
    timestamp: Date.now() - 1000 * 60 * 180, // 3 hours ago
    read: true,
    priority: 'normal',
    draftReply: 'Rhodey, patch 4.2.1 is already compiled and waiting on the satellite link. Syncing War Machine avionics now.',
    status: 'received',
  },
];

export const MailCommunicationsPanel: React.FC<MailCommunicationsPanelProps> = ({
  emails,
  onReplyEmail,
  onSendNewEmail,
  onMarkRead,
  onRefreshMail,
  isProcessing = false,
}) => {
  const [selectedMailId, setSelectedMailId] = useState<string>(emails[0]?.id || 'mail_1');
  const [replyInput, setReplyInput] = useState<string>(emails[0]?.draftReply || '');
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  const selectedMail = emails.find((m) => m.id === selectedMailId) || emails[0];
  const unreadCount = emails.filter((m) => !m.read).length;

  useEffect(() => {
    if (selectedMail) {
      setReplyInput(selectedMail.draftReply || '');
      if (!selectedMail.read) {
        onMarkRead(selectedMail.id);
      }
    }
  }, [selectedMailId]);

  const handleSelectMail = (mail: EmailMessage) => {
    setSelectedMailId(mail.id);
    if (!mail.read) {
      onMarkRead(mail.id);
    }
    setReplyInput(mail.draftReply || '');
  };

  const handleSendReply = () => {
    if (!selectedMail) return;
    const textToSend = replyInput.trim() || selectedMail.draftReply || 'Message received. JARVIS has logged your dispatch, sir.';
    onReplyEmail(selectedMail.id, textToSend);
  };

  const handleComposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject) return;
    onSendNewEmail(composeTo, composeSubject, composeBody);
    setShowCompose(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
  };

  return (
    <div className="w-full bg-slate-950/80 border border-cyan-800/60 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col gap-4">
      {/* Top Holographic Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-950/90 border border-cyan-600/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            <Mail className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider text-cyan-200 uppercase font-mono">
                Encrypted Comms & Mail Dispatch
              </h2>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  {unreadCount} UNREAD
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ALL PROCESSED
                </span>
              )}
            </div>
            <p className="text-[11px] text-cyan-500/70 font-mono">
              Stark Industries High-Bandwidth Satellite Relay • Ultra-Low Latency (&lt;15ms)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            id="btn-refresh-mail"
            onClick={onRefreshMail}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-cyan-950 border border-cyan-800/60 hover:border-cyan-400 text-cyan-300 flex items-center gap-1.5 transition-all"
            title="Refresh satellite inbox"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">SYNC</span>
          </button>

          <button
            type="button"
            id="btn-compose-mail"
            onClick={() => setShowCompose(!showCompose)}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-slate-950 font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{showCompose ? 'CLOSE COMPOSE' : 'COMPOSE DISPATCH'}</span>
          </button>
        </div>
      </div>

      {/* Compose Form Modal/Drawer */}
      {showCompose && (
        <form
          onSubmit={handleComposeSubmit}
          className="w-full bg-slate-900/90 border border-cyan-700/60 rounded-xl p-4 flex flex-col gap-3 font-mono text-xs animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
            <span className="text-cyan-300 font-bold uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              New Encrypted Dispatch
            </span>
            <span className="text-[10px] text-cyan-500/60">PGP-4096 BIT ENCRYPTION</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-cyan-400/80 block mb-1">RECIPIENT (CALLSIGN / EMAIL):</label>
              <input
                type="text"
                placeholder="e.g. Pepper Potts <p.potts@starkindustries.com>"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                required
                className="w-full bg-slate-950 border border-cyan-800/80 rounded px-2.5 py-1.5 text-cyan-100 placeholder:text-cyan-700 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-cyan-400/80 block mb-1">SUBJECT / PROTOCOL:</label>
              <input
                type="text"
                placeholder="e.g. Arc Reactor Grid Sync"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                required
                className="w-full bg-slate-950 border border-cyan-800/80 rounded px-2.5 py-1.5 text-cyan-100 placeholder:text-cyan-700 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-cyan-400/80 block mb-1">DISPATCH CONTENT:</label>
            <textarea
              rows={3}
              placeholder="Enter directive or message to transmit..."
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              className="w-full bg-slate-950 border border-cyan-800/80 rounded p-2.5 text-cyan-100 placeholder:text-cyan-700 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCompose(false)}
              className="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Transmit Immediately
            </button>
          </div>
        </form>
      )}

      {/* Main Mail Viewer Split View */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Email List Column */}
        <div className="md:col-span-5 flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
          {emails.map((mail) => {
            const isSelected = mail.id === selectedMailId;
            return (
              <button
                key={mail.id}
                id={`mail-item-${mail.id}`}
                type="button"
                onClick={() => handleSelectMail(mail)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-950/70 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'bg-slate-900/60 hover:bg-slate-900/90 border-cyan-900/40 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className={`font-bold flex items-center gap-1.5 ${isSelected ? 'text-cyan-200' : 'text-slate-200'}`}>
                    <User className="w-3 h-3 text-cyan-400" />
                    {mail.sender}
                  </span>
                  <div className="flex items-center gap-1">
                    {mail.priority === 'urgent' && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-950/80 text-red-300 border border-red-500/60 font-bold">
                        URGENT
                      </span>
                    )}
                    {mail.status === 'replied' ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 flex items-center gap-0.5">
                        <CheckCheck className="w-2.5 h-2.5" /> SENT
                      </span>
                    ) : !mail.read ? (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    ) : null}
                  </div>
                </div>

                <div className="text-xs font-semibold text-cyan-100 truncate">
                  {mail.subject}
                </div>

                <p className="text-[11px] text-cyan-600/90 line-clamp-1 font-mono">
                  {mail.snippet}
                </p>

                <div className="flex items-center justify-between text-[10px] text-cyan-500/50 font-mono mt-0.5">
                  <span>{new Date(mail.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {mail.draftReply && mail.status !== 'replied' && (
                    <span className="text-emerald-400/80 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> AI Draft Ready
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Email Reading & Response Pane */}
        <div className="md:col-span-7 bg-slate-900/70 border border-cyan-800/50 rounded-xl p-4 flex flex-col justify-between gap-4 font-mono">
          {selectedMail ? (
            <>
              {/* Header Info */}
              <div className="flex flex-col gap-2 border-b border-cyan-900/40 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-cyan-100 font-sans">
                      {selectedMail.subject}
                    </h3>
                    <div className="text-[11px] text-cyan-400/80 mt-0.5 flex items-center gap-2">
                      <span>From: <strong className="text-cyan-200">{selectedMail.sender}</strong> ({selectedMail.senderEmail})</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-cyan-500/70 shrink-0">
                    {new Date(selectedMail.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Email Body */}
              <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line py-1 flex-1 max-h-[140px] overflow-y-auto">
                {selectedMail.body}
              </div>

              {/* Status / Reply Dispatch Box */}
              <div className="bg-slate-950/90 border border-cyan-800/70 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                    <Reply className="w-3.5 h-3.5 text-cyan-400" />
                    {selectedMail.status === 'replied' ? 'DISPATCH ARCHIVE (REPLIED)' : 'JARVIS INTELLIGENT REPLY'}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Instant Relay &lt;15ms
                  </span>
                </div>

                {selectedMail.status === 'replied' ? (
                  <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-600/40 text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Response successfully dispatched to {selectedMail.sender}. Subsystem confirmed.</span>
                  </div>
                ) : (
                  <>
                    <textarea
                      rows={2}
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder="Say 'Hey Jarvis, send mail response' or edit reply here..."
                      className="w-full bg-slate-900 border border-cyan-900/80 rounded p-2 text-cyan-100 text-xs focus:outline-none focus:border-cyan-400 placeholder:text-cyan-700/70 font-mono"
                    />

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[10px] text-cyan-500/70">
                        Voice: Say <em className="text-cyan-300">"Hey Jarvis, reply to {selectedMail.sender.split(' ')[0]}"</em>
                      </span>

                      <button
                        type="button"
                        id="btn-send-mail-reply"
                        onClick={handleSendReply}
                        className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>DISPATCH RESPONSE</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-cyan-500/60 text-xs">
              No communications selected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
