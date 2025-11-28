'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageSquare, Trash2, Menu } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ChatSummary {
  id: string;
  preview: string;
  createdAt: string;
  messageCount: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatList, setChatList] = useState<ChatSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [messageLimitReached, setMessageLimitReached] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadChatList();
    const saved = localStorage.getItem('gmbChatId');
    if (saved) loadChat(saved);
  }, []);

  const loadChatList = async () => {
    try {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const data = await res.json();
        setChatList(data.chats || []);
      }
    } catch (err) {
      console.error('Failed to load chats');
    }
  };

  const loadChat = async (id: string) => {
    if (id === chatId) return;

    setIsLoading(true);
    setChatId(id);
    localStorage.setItem('gmbChatId', id);
    setMessageLimitReached(false);

    try {
      const res = await fetch(`/api/chat?chatId=${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(data.messages || []);
      setMessageLimitReached(data.limitReached || false);
      setIsSidebarOpen(false);
    } catch (err) {
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setChatId(null);
    setInput('');
    localStorage.removeItem('gmbChatId');
    setMessageLimitReached(false);
  };

  const openDeleteDialog = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!chatToDelete) return;

    try {
      await fetch(`/api/chat/${chatToDelete}`, { method: 'DELETE' });
      if (chatId === chatToDelete) startNewChat();
      loadChatList();
    } catch (err) {
      console.error('Delete failed');
    } finally {
      setDeleteDialogOpen(false);
      setChatToDelete(null);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || messageLimitReached) return;

    const userMsg = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, chatId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.limitReached) {
          setMessageLimitReached(true);
          setMessages(prev => prev.slice(0, -1));
          return;
        }
        throw new Error();
      }

      if (data.chatId) {
        setChatId(data.chatId);
        localStorage.setItem('gmbChatId', data.chatId);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message.content,
      }]);

      setMessageLimitReached(data.limitReached || false);
      loadChatList();
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentTitle = chatList.find(c => c.id === chatId)?.preview || 'New Chat';

  return (
    <>
      <div className="flex h-screen bg-slate-950 text-white">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-slate-900 border-r border-slate-800 transform transition lg:relative lg:translate-x-0 ${isSidebarOpen ? '' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-800">
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-medium bg-gradient-to-r from-[#8c5cff] to-purple-600 hover:opacity-90 transition shadow-lg"
              >
                <Sparkles size={20} />
                New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {chatList.length === 0 ? (
                <p className="text-center text-slate-500 text-sm mt-10">No conversations yet</p>
              ) : (
                chatList.map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => loadChat(chat.id)}
                    className={`group p-4 rounded-xl cursor-pointer transition border ${
                      chat.id === chatId
                        ? 'border-[#8c5cff] shadow-md shadow-[#8c5cff]/20'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <MessageSquare size={18} className="mt-0.5 text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-white">
                          {chat.preview}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(chat.createdAt).toLocaleDateString()} · {chat.messageCount} msgs
                        </p>
                      </div>
                      <button
                        onClick={(e) => openDeleteDialog(chat.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 rounded-lg transition"
                      >
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Chat */}
        <div className="flex-1 flex flex-col">
          <div className="border-b border-slate-800">
            <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="lg:hidden p-2 hover:bg-slate-800 rounded-lg"
                >
                  <Menu size={22} />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-white">{currentTitle}</h1>
                  <p className="text-sm text-slate-400">GMB Assistant • Gemini AI</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-6 py-8">
              {messages.length === 0 ? (
                <div className="text-center py-24">
                  <Sparkles size={64} className="mx-auto mb-6 text-slate-500" />
                  <h2 className="text-2xl font-bold mb-3 text-white">Welcome to GMB Assistant</h2>
                  <p className="text-slate-400">Ask anything about Google Business Profile</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-2xl rounded-2xl px-6 py-4 border ${
                        msg.role === 'user'
                          ? 'border-[#8c5cff] bg-gradient-to-r from-[#8c5cff]/10 to-purple-600/10 text-white'
                          : 'border-slate-700 text-slate-100'
                      }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="border border-slate-700 rounded-2xl px-6 py-4">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-slate-800">
            <div className="max-w-5xl mx-auto px-6 py-6">
              {messageLimitReached && (
                <div className="mb-4 p-4 border border-orange-500/50 rounded-xl text-orange-300 text-center font-medium">
                  You've reached the 10-message limit. Start a new chat to continue!
                </div>
              )}

              <form onSubmit={sendMessage} className="flex gap-4">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask about Google My Business..."
                  disabled={messageLimitReached}
                  className="flex-1 px-6 py-4 bg-transparent border border-slate-700 rounded-2xl focus:border-[#8c5cff] outline-none placeholder-slate-500 text-white transition"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim() || messageLimitReached}
                  className="px-8 py-4 bg-gradient-to-r from-[#8c5cff] to-purple-600 hover:opacity-90 disabled:opacity-50 rounded-2xl font-medium flex items-center gap-2 transition shadow-lg"
                >
                  <Send size={20} />
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog (shadcn/ui) */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Conversation?</DialogTitle>
            <DialogDescription className="text-slate-400">
              This action cannot be undone. This will permanently delete the chat and all its messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-slate-700 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}