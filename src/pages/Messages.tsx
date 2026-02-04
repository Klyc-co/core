import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import ClientHeader from "@/components/ClientHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Contact {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

interface MessagesProps {
  portalType: "marketer" | "client";
}

const Messages = ({ portalType }: MessagesProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate(portalType === "marketer" ? "/auth" : "/client/auth");
        return;
      }
      setUser(user);
      await fetchContacts(user.id);
      
      const partnerId = searchParams.get("with");
      if (partnerId) {
        setSelectedContact(partnerId);
      }
    };

    initAuth();
  }, [navigate, portalType, searchParams]);

  useEffect(() => {
    if (selectedContact && user) {
      fetchMessages(user.id, selectedContact);
      markMessagesAsRead(user.id, selectedContact);
    }
  }, [selectedContact, user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === selectedContact || newMsg.receiver_id === selectedContact) {
            setMessages(prev => [...prev, newMsg]);
            if (newMsg.receiver_id === user.id) {
              markMessagesAsRead(user.id, selectedContact!);
            }
          }
          fetchContacts(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchContacts = async (userId: string) => {
    try {
      // Get linked clients/marketers from marketer_clients table
      const { data: relationships, error: relError } = await supabase
        .from("marketer_clients")
        .select("*")
        .or(`marketer_id.eq.${userId},client_id.eq.${userId}`);

      if (relError) throw relError;

      // Build contact list from relationships
      const contactMap = new Map<string, Contact>();
      
      for (const rel of relationships || []) {
        // Determine if current user is marketer or client in this relationship
        const isMarketer = rel.marketer_id === userId;
        const partnerId = isMarketer ? rel.client_id : rel.marketer_id;
        
        // For clients viewing their marketer, try to get marketer's business name
        let partnerName = isMarketer ? rel.client_name : "Your Marketer";
        const partnerEmail = isMarketer ? rel.client_email : null;
        
        // If current user is a client, try to fetch the marketer's profile/business name
        if (!isMarketer) {
          const { data: marketerProfile } = await supabase
            .from("client_profiles")
            .select("business_name")
            .eq("user_id", rel.marketer_id)
            .maybeSingle();
          
          if (marketerProfile?.business_name) {
            partnerName = marketerProfile.business_name;
          }
        }
        
        contactMap.set(partnerId, {
          id: rel.id,
          partnerId,
          partnerName,
          partnerEmail,
          unreadCount: 0,
        });
      }

      // Get recent messages to add last message info and unread counts
      const { data: allMessages, error: msgError } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (!msgError && allMessages) {
        for (const msg of allMessages) {
          const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
          
          if (contactMap.has(partnerId)) {
            const contact = contactMap.get(partnerId)!;
            
            // Set last message if not already set
            if (!contact.lastMessage) {
              contact.lastMessage = msg.content;
              contact.lastMessageAt = msg.created_at;
            }
            
            // Count unread messages
            if (msg.receiver_id === userId && !msg.is_read) {
              contact.unreadCount++;
            }
          }
        }
      }

      // Sort contacts: those with messages first, then by last message time
      const sortedContacts = Array.from(contactMap.values()).sort((a, b) => {
        if (a.lastMessageAt && !b.lastMessageAt) return -1;
        if (!a.lastMessageAt && b.lastMessageAt) return 1;
        if (a.lastMessageAt && b.lastMessageAt) {
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        }
        return a.partnerName.localeCompare(b.partnerName);
      });

      setContacts(sortedContacts);
      
      // Auto-select first contact if none selected
      if (!selectedContact && sortedContacts.length > 0) {
        const partnerId = searchParams.get("with");
        if (partnerId && sortedContacts.find(c => c.partnerId === partnerId)) {
          setSelectedContact(partnerId);
        }
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string, partnerId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const markMessagesAsRead = async (userId: string, partnerId: string) => {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", userId)
      .eq("sender_id", partnerId);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: selectedContact,
        content: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleContactSelect = (partnerId: string) => {
    setSelectedContact(partnerId);
    setMessages([]); // Clear messages while loading
  };

  const selectedContactInfo = contacts.find(c => c.partnerId === selectedContact);
  const Header = portalType === "marketer" ? AppHeader : ClientHeader;

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Messages</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
          {/* Contacts List */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {portalType === "marketer" ? "Clients" : "Your Marketer"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="text-center py-8 px-4 text-muted-foreground text-sm">
                    {portalType === "marketer" 
                      ? "No clients yet. Add a client to start messaging."
                      : "No marketer connected yet."}
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleContactSelect(contact.partnerId)}
                      className={`w-full p-4 text-left hover:bg-muted/50 transition-colors border-b border-border ${
                        selectedContact === contact.partnerId ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>
                            {contact.partnerName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground truncate">
                              {contact.partnerName}
                            </span>
                            {contact.unreadCount > 0 && (
                              <span className="w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                                {contact.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {contact.lastMessage || "Start a conversation"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Messages Area */}
          <Card className="md:col-span-2 flex flex-col">
            {selectedContact && selectedContactInfo ? (
              <>
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-lg">
                    {selectedContactInfo.partnerName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 flex flex-col">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No messages yet. Say hello!</p>
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                msg.sender_id === user?.id
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-muted rounded-bl-sm"
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className={`text-xs mt-1 ${
                                msg.sender_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        sendMessage();
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message ${selectedContactInfo.partnerName}...`}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={sending || !newMessage.trim()}>
                        {sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>
                    {contacts.length === 0 
                      ? (portalType === "marketer" 
                          ? "Add a client to start messaging" 
                          : "You'll be able to message your marketer once connected")
                      : "Select a conversation to start messaging"}
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Messages;
