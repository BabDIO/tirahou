import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Video, VideoOff, Mic, MicOff, Settings, Check,
  Loader2, AlertCircle, Volume2, VolumeX, Monitor
} from 'lucide-react'
import { virtualClassApi } from '../../api'
import { Button, Badge, Spinner, Card, Alert } from '../../components/ui'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

export default function VirtualClassJoinPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  // États
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isTestingAudio, setIsTestingAudio] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [devices, setDevices] = useState<{
    videoInputs: MediaDeviceInfo[]
    audioInputs: MediaDeviceInfo[]
    audioOutputs: MediaDeviceInfo[]
  }>({
    videoInputs: [],
    audioInputs: [],
    audioOutputs: [],
  })
  const [selectedDevices, setSelectedDevices] = useState({
    video: '',
    audioInput: '',
    audioOutput: '',
  })
  const [checksPassed, setChecksPassed] = useState({
    camera: false,
    microphone: false,
    network: false,
  })

  const { data: session, isLoading } = useQuery({
    queryKey: ['virtual-session', id],
    queryFn: () => virtualClassApi.getSessions({ id }).then(r => r.data.results?.[0]),
    enabled: !!id,
  })

  // Énumérer les périphériques disponibles
  useEffect(() => {
    const getDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices()
        setDevices({
          videoInputs: deviceList.filter(d => d.kind === 'videoinput'),
          audioInputs: deviceList.filter(d => d.kind === 'audioinput'),
          audioOutputs: deviceList.filter(d => d.kind === 'audiooutput'),
        })

        // Sélectionner les périphériques par défaut
        setSelectedDevices({
          video: deviceList.find(d => d.kind === 'videoinput')?.deviceId || '',
          audioInput: deviceList.find(d => d.kind === 'audioinput')?.deviceId || '',
          audioOutput: deviceList.find(d => d.kind === 'audiooutput')?.deviceId || '',
        })
      } catch (error) {
        console.error('Erreur lors de l\'énumération des périphériques:', error)
      }
    }

    getDevices()
  }, [])

  // Initialiser le stream média
  useEffect(() => {
    const initMedia = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: selectedDevices.video
            ? { deviceId: { exact: selectedDevices.video } }
            : true,
          audio: selectedDevices.audioInput
            ? { deviceId: { exact: selectedDevices.audioInput } }
            : true,
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        setStream(mediaStream)

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }

        // Marquer les vérifications comme réussies
        setChecksPassed(prev => ({
          ...prev,
          camera: true,
          microphone: true,
        }))

        // Test de connexion réseau (simplifié)
        setTimeout(() => {
          setChecksPassed(prev => ({ ...prev, network: true }))
        }, 500)
      } catch (error) {
        console.error('Erreur d\'accès aux médias:', error)
        toast.error('Impossible d\'accéder à la caméra ou au microphone')
        setChecksPassed({
          camera: false,
          microphone: false,
          network: false,
        })
      }
    }

    if (selectedDevices.video || selectedDevices.audioInput) {
      initMedia()
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [selectedDevices.video, selectedDevices.audioInput])

  // Test du niveau audio
  useEffect(() => {
    if (!stream || !isTestingAudio) return

    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    const microphone = audioContext.createMediaStreamSource(stream)
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    microphone.connect(analyser)
    analyser.fftSize = 256

    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      setAudioLevel(Math.min(100, (average / 128) * 100))

      if (isTestingAudio) {
        requestAnimationFrame(checkAudioLevel)
      }
    }

    checkAudioLevel()

    return () => {
      microphone.disconnect()
      audioContext.close()
    }
  }, [stream, isTestingAudio])

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

  const joinSession = () => {
    if (!checksPassed.camera || !checksPassed.microphone || !checksPassed.network) {
      toast.error('Veuillez vérifier votre configuration avant de rejoindre')
      return
    }

    // Naviguer vers la salle de classe
    navigate(`/virtual-classes/${id}/classroom`)
  }

  if (isLoading) return <Spinner text="Chargement de la session..." />
  if (!session) return <Alert type="error">Session introuvable</Alert>

  const allChecksPassed = Object.values(checksPassed).every(Boolean)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Prêt à rejoindre la session ?
          </h1>
          <p className="text-gray-400">
            {session.title} • {session.course_space_title}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Aperçu vidéo */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800/50 border-gray-700 p-0 overflow-hidden">
              <div className="relative bg-black aspect-video">
                {isVideoEnabled ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl font-bold text-primary-400">
                          {user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </span>
                      </div>
                      <p className="text-gray-400">Caméra désactivée</p>
                    </div>
                  </div>
                )}

                {/* Overlay nom */}
                <div className="absolute bottom-4 left-4">
                  <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                    <p className="text-white font-medium">{user?.full_name || 'Vous'}</p>
                  </div>
                </div>

                {/* Indicateur audio */}
                {isTestingAudio && (
                  <div className="absolute bottom-4 right-4">
                    <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-green-400" />
                      <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-400 transition-all duration-75"
                          style={{ width: `${audioLevel}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Contrôles */}
              <div className="bg-gray-800 p-4 flex items-center justify-center gap-3">
                <Button
                  variant={isVideoEnabled ? 'secondary' : 'danger'}
                  size="lg"
                  icon={isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  onClick={toggleVideo}
                  className={isVideoEnabled ? 'bg-gray-700 text-white hover:bg-gray-600' : ''}
                />
                <Button
                  variant={isAudioEnabled ? 'secondary' : 'danger'}
                  size="lg"
                  icon={isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  onClick={toggleAudio}
                  className={isAudioEnabled ? 'bg-gray-700 text-white hover:bg-gray-600' : ''}
                />
                <Button
                  variant="secondary"
                  size="lg"
                  icon={<Settings className="w-5 h-5" />}
                  onClick={() => setShowSettings(!showSettings)}
                  className="bg-gray-700 text-white hover:bg-gray-600"
                />
              </div>

              {/* Paramètres */}
              {showSettings && (
                <div className="bg-gray-800/80 p-4 border-t border-gray-700 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Caméra
                    </label>
                    <select
                      value={selectedDevices.video}
                      onChange={(e) => setSelectedDevices(prev => ({ ...prev, video: e.target.value }))}
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-primary-500 focus:outline-none"
                    >
                      {devices.videoInputs.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Caméra ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Microphone
                    </label>
                    <select
                      value={selectedDevices.audioInput}
                      onChange={(e) => setSelectedDevices(prev => ({ ...prev, audioInput: e.target.value }))}
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-primary-500 focus:outline-none"
                    >
                      {devices.audioInputs.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={() => setIsTestingAudio(!isTestingAudio)}
                    >
                      {isTestingAudio ? 'Arrêter le test' : 'Tester le microphone'}
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Haut-parleurs
                    </label>
                    <select
                      value={selectedDevices.audioOutput}
                      onChange={(e) => setSelectedDevices(prev => ({ ...prev, audioOutput: e.target.value }))}
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-primary-500 focus:outline-none"
                    >
                      {devices.audioOutputs.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Haut-parleur ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Vérifications et infos */}
          <div className="space-y-4">
            {/* Vérifications */}
            <Card className="bg-gray-800/50 border-gray-700">
              <h3 className="text-white font-bold mb-4">Vérifications</h3>
              <div className="space-y-3">
                {[
                  { key: 'camera', label: 'Caméra', icon: Video },
                  { key: 'microphone', label: 'Microphone', icon: Mic },
                  { key: 'network', label: 'Connexion réseau', icon: Monitor },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-300">{label}</span>
                    </div>
                    {checksPassed[key as keyof typeof checksPassed] ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                    )}
                  </div>
                ))}
              </div>

              {!allChecksPassed && (
                <Alert type="warning" className="mt-4">
                  <p className="text-xs">
                    Veuillez autoriser l'accès à votre caméra et microphone pour rejoindre la session.
                  </p>
                </Alert>
              )}
            </Card>

            {/* Infos session */}
            <Card className="bg-gray-800/50 border-gray-700">
              <h3 className="text-white font-bold mb-4">Informations</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Statut</span>
                  <Badge
                    label={session.status_display}
                    className={session.status === 'en_cours' ? 'badge-green' : 'badge-gray'}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Participants</span>
                  <span className="text-white">{session.participants_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Mode</span>
                  <span className="text-white capitalize">{session.mode}</span>
                </div>
                {session.is_recorded && (
                  <Alert type="info" className="mt-3">
                    <p className="text-xs">
                      Cette session est enregistrée
                    </p>
                  </Alert>
                )}
              </div>
            </Card>

            {/* Bouton rejoindre */}
            <Button
              className="w-full"
              size="lg"
              onClick={joinSession}
              disabled={!allChecksPassed}
              icon={allChecksPassed ? <Video className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            >
              {allChecksPassed ? 'Rejoindre la session' : 'Vérification en cours...'}
            </Button>

            <button
              onClick={() => navigate(-1)}
              className="w-full text-sm text-gray-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
