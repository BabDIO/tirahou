import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff,
  Users, MessageSquare, Hand, Settings, Phone,
  Maximize, Minimize, Volume2, VolumeX, ArrowLeft,
  Send, MoreVertical, UserPlus, Copy, CheckCircle
} from 'lucide-react'
import { virtualClassApi } from '../../api'
import { Button, Badge, Spinner, Card, Alert } from '../../components/ui'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

interface Participant {
  id: string
  name: string
  avatar?: string
  role: 'teacher' | 'student' | 'moderator'
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  isHandRaised: boolean
  isScreenSharing: boolean
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: Date
  isPrivate?: boolean
}

export default function VirtualClassroomPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  // États UI
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [showChat, setShowChat] = useState(true)
  const [showParticipants, setShowParticipants] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [isMuted, setIsMuted] = useState(false)

  // Données mockées (à remplacer par WebRTC/Socket.io)
  const [participants] = useState<Participant[]>([
    {
      id: '1',
      name: 'Prof. Dupont',
      role: 'teacher',
      isAudioEnabled: true,
      isVideoEnabled: true,
      isHandRaised: false,
      isScreenSharing: true,
    },
    {
      id: '2',
      name: 'Jean Martin',
      role: 'student',
      isAudioEnabled: true,
      isVideoEnabled: true,
      isHandRaised: false,
      isScreenSharing: false,
    },
    {
      id: '3',
      name: 'Marie Dubois',
      role: 'student',
      isAudioEnabled: false,
      isVideoEnabled: true,
      isHandRaised: true,
      isScreenSharing: false,
    },
  ])

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      userId: '1',
      userName: 'Prof. Dupont',
      message: 'Bienvenue à tous dans ce cours !',
      timestamp: new Date(),
    },
  ])

  const { data: session, isLoading } = useQuery({
    queryKey: ['virtual-session', id],
    queryFn: () => virtualClassApi.getSessions({ id }).then(r => r.data.results?.[0]),
    enabled: !!id,
  })

  // Initialiser la webcam
  useEffect(() => {
    const initMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch (error) {
        console.error('Erreur d\'accès aux médias:', error)
        toast.error('Impossible d\'accéder à la caméra ou au microphone')
      }
    }

    initMedia()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled
      })
      setIsVideoEnabled(!isVideoEnabled)
    }
  }

  const toggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled
      })
      setIsAudioEnabled(!isAudioEnabled)
    }
  }

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        })
        // TODO: Partager le flux avec les autres participants
        setIsScreenSharing(true)
        toast.success('Partage d\'écran activé')
      } else {
        // Arrêter le partage d'écran
        setIsScreenSharing(false)
        toast.success('Partage d\'écran arrêté')
      }
    } catch (error) {
      toast.error('Erreur lors du partage d\'écran')
    }
  }

  const toggleHandRaise = () => {
    setIsHandRaised(!isHandRaised)
    toast.success(isHandRaised ? 'Main baissée' : 'Main levée')
  }

  const leaveSession = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    navigate('/virtual-classes')
  }

  const sendMessage = () => {
    if (!chatMessage.trim()) return

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: user?.id || '',
      userName: user?.full_name || 'Vous',
      message: chatMessage,
      timestamp: new Date(),
    }

    setChatMessages([...chatMessages, newMessage])
    setChatMessage('')
  }

  const copyJoinLink = () => {
    const joinLink = `${window.location.origin}/virtual-classes/${id}/join`
    navigator.clipboard.writeText(joinLink)
    toast.success('Lien copié dans le presse-papier')
  }

  if (isLoading) return <Spinner text="Connexion à la session..." />
  if (!session) return <Alert type="error">Session introuvable</Alert>

  const raisedHandsCount = participants.filter(p => p.isHandRaised).length

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(-1)}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            Quitter
          </Button>
          <div>
            <h1 className="text-white font-bold text-lg">{session.title}</h1>
            <p className="text-gray-400 text-xs">{session.course_space_title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            label={`${participants.length} participants`}
            className="bg-gray-700 text-gray-200"
          />
          {session.is_recorded && (
            <Badge
              label="● ENREGISTREMENT"
              className="bg-red-600 text-white animate-pulse"
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={<Copy className="w-4 h-4" />}
            onClick={copyJoinLink}
            className="text-gray-300 hover:text-white"
          >
            Copier le lien
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 bg-gray-900 p-4 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
            {/* Video principal (écran partagé ou enseignant) */}
            <div className="col-span-full lg:col-span-2 bg-black rounded-xl overflow-hidden relative group">
              {isScreenSharing ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Monitor className="w-16 h-16 text-gray-600" />
                  <p className="text-gray-400 ml-4">Partage d'écran en cours...</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}

              {/* Overlay info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div>
                    <p className="text-white font-bold">{user?.full_name || 'Vous'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {isAudioEnabled ? (
                        <Mic className="w-4 h-4 text-green-400" />
                      ) : (
                        <MicOff className="w-4 h-4 text-red-400" />
                      )}
                      {isVideoEnabled ? (
                        <Video className="w-4 h-4 text-green-400" />
                      ) : (
                        <VideoOff className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="text-white hover:bg-white/20"
                  />
                </div>
              </div>
            </div>

            {/* Participants */}
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="bg-gray-800 rounded-xl overflow-hidden relative group aspect-video"
              >
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500 to-violet-600">
                  <span className="text-4xl font-bold text-white">
                    {participant.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>

                {/* Info participant */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium">{participant.name}</p>
                        {participant.role === 'teacher' && (
                          <Badge label="Prof" className="bg-yellow-500 text-white text-xs" />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {participant.isHandRaised && <Hand className="w-4 h-4 text-yellow-400" />}
                        {participant.isAudioEnabled ? (
                          <Mic className="w-3 h-3 text-green-400" />
                        ) : (
                          <MicOff className="w-3 h-3 text-red-400" />
                        )}
                        {participant.isVideoEnabled ? (
                          <Video className="w-3 h-3 text-green-400" />
                        ) : (
                          <VideoOff className="w-3 h-3 text-red-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar droite (Chat + Participants) */}
        {(showChat || showParticipants) && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => { setShowChat(true); setShowParticipants(false) }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  showChat
                    ? 'text-white bg-gray-900 border-b-2 border-primary-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Chat
              </button>
              <button
                onClick={() => { setShowChat(false); setShowParticipants(true) }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  showParticipants
                    ? 'text-white bg-gray-900 border-b-2 border-primary-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Participants ({participants.length})
                {raisedHandsCount > 0 && (
                  <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                    {raisedHandsCount}
                  </span>
                )}
              </button>
            </div>

            {/* Chat */}
            {showChat && (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-300">{msg.userName}</span>
                        <span className="text-xs text-gray-500">
                          {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="bg-gray-700 rounded-lg px-3 py-2">
                        <p className="text-sm text-gray-100">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-gray-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Envoyer un message..."
                      className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <Button
                      size="sm"
                      icon={<Send className="w-4 h-4" />}
                      onClick={sendMessage}
                      disabled={!chatMessage.trim()}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Participants */}
            {showParticipants && (
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-violet-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {participant.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {participant.name}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {participant.role === 'teacher' && (
                          <Badge label="Prof" className="bg-yellow-500/20 text-yellow-400 text-xs" />
                        )}
                        {participant.isHandRaised && (
                          <Hand className="w-3 h-3 text-yellow-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {participant.isAudioEnabled ? (
                        <Mic className="w-4 h-4 text-green-400" />
                      ) : (
                        <MicOff className="w-4 h-4 text-gray-500" />
                      )}
                      {participant.isVideoEnabled ? (
                        <Video className="w-4 h-4 text-green-400" />
                      ) : (
                        <VideoOff className="w-4 h-4 text-gray-500" />
                      )}
                      <button className="p-1 hover:bg-gray-600 rounded">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-gray-800 px-6 py-4 border-t border-gray-700">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Left controls */}
          <div className="flex items-center gap-2">
            <Button
              variant={isVideoEnabled ? 'secondary' : 'danger'}
              size="md"
              icon={isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              onClick={toggleVideo}
              className={isVideoEnabled ? 'bg-gray-700 text-white hover:bg-gray-600' : ''}
            />
            <Button
              variant={isAudioEnabled ? 'secondary' : 'danger'}
              size="md"
              icon={isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              onClick={toggleAudio}
              className={isAudioEnabled ? 'bg-gray-700 text-white hover:bg-gray-600' : ''}
            />
            <Button
              variant="secondary"
              size="md"
              icon={isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              onClick={() => setIsMuted(!isMuted)}
              className="bg-gray-700 text-white hover:bg-gray-600"
            />
          </div>

          {/* Center controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              icon={isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              onClick={toggleScreenShare}
              className={`${isScreenSharing ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
            >
              {isScreenSharing ? 'Arrêter le partage' : 'Partager l\'écran'}
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={<Hand className="w-5 h-5" />}
              onClick={toggleHandRaise}
              className={`${isHandRaised ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
            >
              {isHandRaised ? 'Baisser la main' : 'Lever la main'}
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={<Settings className="w-5 h-5" />}
              className="bg-gray-700 text-white hover:bg-gray-600"
            />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="md"
              icon={<Phone className="w-5 h-5" />}
              onClick={leaveSession}
            >
              Quitter
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
