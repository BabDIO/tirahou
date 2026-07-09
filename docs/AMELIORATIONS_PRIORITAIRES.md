# 🚀 PLAN D'AMÉLIORATION FRONTEND - TIRAHOU
## Fonctionnalités Prioritaires et Optimisations UX

**Date** : Juillet 2026  
**Version cible** : 1.3.0  
**Conformité actuelle** : 94.2%  
**Conformité cible** : 98%+  

---

## 📋 RÉSUMÉ EXÉCUTIF

Suite à l'analyse de conformité au cahier des charges, voici les améliorations prioritaires à apporter au frontend pour atteindre une conformité quasi-totale et améliorer l'expérience utilisateur.

---

## 🎯 PRIORITÉ 1 : AMÉLIORATIONS CRITIQUES (2-3 semaines)

### 1. Module Parents/Tuteurs 👨‍👩‍👦
**Statut** : 🔴 Non implémenté  
**Impact** : Moyen  
**Effort** : 2-3 jours  

#### Backend à ajouter :
```python
# backend/apps/people/models.py
class ParentGuardian(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='parents')
    relationship = models.CharField(max_length=20, choices=[
        ('pere', 'Père'),
        ('mere', 'Mère'),
        ('tuteur', 'Tuteur légal'),
        ('autre', 'Autre')
    ])
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20)
    address = models.TextField(blank=True)
    profession = models.CharField(max_length=100, blank=True)
    can_receive_notifications = models.BooleanField(default=True)
    notification_preferences = models.JSONField(default=dict)  # types de notifications autorisées
```

#### Frontend à ajouter :
- Page `ParentsManagementPage.tsx` (admin/scolarité)
- Section dans `ProfilePage.tsx` pour étudiants (ajout parents)
- Notification targeting pour parents dans `CommunicationPage.tsx`

---

### 2. Notifications Temps Réel (WebSocket) 🔔
**Statut** : 🔴 Non implémenté  
**Impact** : Élevé (UX)  
**Effort** : 5-7 jours  

#### Stack technique recommandée :
- **Backend** : Django Channels + Redis
- **Frontend** : Socket.io client ou native WebSocket

#### Implémentation :
```typescript
// frontend/src/lib/websocket.ts
import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  
  connect(token: string) {
    this.socket = io(import.meta.env.VITE_WS_URL, {
      auth: { token },
      transports: ['websocket']
    });
    
    this.socket.on('notification', (data) => {
      // Afficher notification toast
      toast.info(data.message);
      // Mettre à jour le store
      useNotificationStore.getState().addNotification(data);
    });
  }
  
  disconnect() {
    this.socket?.disconnect();
  }
}

export const wsService = new WebSocketService();
```

#### Types d'événements temps réel :
- Nouvelles notifications
- Nouveaux messages
- Résultats publiés
- Paiements validés
- Classe virtuelle démarrée
- Devoir noté
- Absence enregistrée

---

### 3. PWA Complète 📱
**Statut** : 🟡 Partiel (60%)  
**Impact** : Moyen  
**Effort** : 3-5 jours  

#### À ajouter :
1. **Service Worker** pour cache offline
2. **Manifest.json** amélioré
3. **Install prompt**
4. **Offline fallback pages**
5. **Background sync** pour actions hors ligne

```typescript
// frontend/src/serviceWorker.ts
const CACHE_NAME = 'tirahou-v1.3.0';
const urlsToCache = [
  '/',
  '/login',
  '/dashboard',
  '/offline.html',
  '/static/css/main.css',
  '/static/js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => caches.match('/offline.html'))
  );
});
```

#### Manifest amélioré :
```json
{
  "name": "TIRAHOU - Plateforme Universitaire",
  "short_name": "TIRAHOU",
  "description": "Système intégré de gestion universitaire hybride",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Mes cours",
      "short_name": "Cours",
      "url": "/student/courses",
      "icons": [{ "src": "/icons/courses.png", "sizes": "96x96" }]
    },
    {
      "name": "Mes notes",
      "short_name": "Notes",
      "url": "/student/grades",
      "icons": [{ "src": "/icons/grades.png", "sizes": "96x96" }]
    }
  ]
}
```

---

## 🎯 PRIORITÉ 2 : AMÉLIORATIONS MAJEURES (3-4 semaines)

### 4. Workflow Transferts/Mobilité Interne 🔄
**Statut** : 🟡 Partiel (70%)  
**Impact** : Moyen  
**Effort** : 3-4 jours  

#### Page à créer :
`TransfersPage.tsx` pour gestion des demandes de transfert

#### Workflow complet :
1. **Étudiant** : Demande de transfert vers autre filière/programme
2. **Chef département origine** : Avis sur le départ
3. **Chef département destination** : Acceptation/refus
4. **Scolarité** : Validation finale et traitement administratif
5. **Système** : Mise à jour automatique inscriptions + groupes

```typescript
// Types
interface TransferRequest {
  id: string;
  student: Student;
  current_program: Program;
  target_program: Program;
  reason: string;
  justification_file?: File;
  status: 'pending' | 'approved_origin' | 'approved_destination' | 'validated' | 'rejected';
  origin_dept_opinion?: string;
  destination_dept_opinion?: string;
  rejection_reason?: string;
  created_at: string;
  processed_at?: string;
}
```

---

### 5. Webhooks HTTP pour Intégrations 🔗
**Statut** : 🟡 Partiel (70%)  
**Impact** : Moyen  
**Effort** : 3-4 jours  

#### Backend à ajouter :
```python
# backend/apps/api/models.py
class Webhook(models.Model):
    name = models.CharField(max_length=100)
    url = models.URLField()
    event_types = models.JSONField(default=list)  # ['enrollment.created', 'payment.validated', ...]
    secret = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    retry_policy = models.JSONField(default=dict)
    
class WebhookLog(models.Model):
    webhook = models.ForeignKey(Webhook, on_delete=models.CASCADE)
    event_type = models.CharField(max_length=100)
    payload = models.JSONField()
    response_status = models.IntegerField()
    response_body = models.TextField()
    attempt_count = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
```

#### Frontend à ajouter :
`WebhooksPage.tsx` pour configuration et monitoring

---

### 6. Intégration Anti-Plagiat 📝
**Statut** : 🟡 Partiel (30%)  
**Impact** : Moyen  
**Effort** : 2-3 jours  

#### Providers supportés :
- Turnitin
- Compilatio
- Plagscan
- Unicheck

#### Implémentation :
```python
# backend/apps/internships/services/plagiarism.py
class PlagiarismService:
    def check_document(self, file_path: str, provider: str = 'turnitin'):
        """Soumet document pour analyse"""
        # Appel API provider
        result = self._call_provider_api(file_path, provider)
        return {
            'similarity_score': result.get('score', 0),
            'sources_found': result.get('sources', []),
            'report_url': result.get('report_url'),
            'status': 'completed'
        }
```

#### UI Frontend :
- Bouton "Vérifier plagiat" sur ThesisDetailPage
- Affichage score + rapport
- Alertes si score > seuil (ex: 30%)

---

## 🎯 PRIORITÉ 3 : OPTIMISATIONS UX (2-3 semaines)

### 7. Mode Sombre/Clair (Dark/Light Theme) 🌓
**Impact** : Élevé (confort utilisateur)  
**Effort** : 2-3 jours  

```typescript
// frontend/src/contexts/ThemeContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark';
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system';
  });

  const effectiveTheme = theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : theme;

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
  }, [theme, effectiveTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
```

---

### 8. Tableau Blanc Collaboratif (Virtual Class) 🎨
**Statut** : 🔴 Non implémenté  
**Impact** : Moyen  
**Effort** : 5-7 jours  

#### Bibliothèques recommandées :
- **Excalidraw** (open source, React-friendly)
- **Tldraw** (moderne, performant)
- **Fabric.js** (canvas avancé)

```typescript
// frontend/src/components/virtual-class/CollaborativeWhiteboard.tsx
import { Excalidraw } from '@excalidraw/excalidraw';
import { Socket } from 'socket.io-client';

export function CollaborativeWhiteboard({ sessionId, socket }: Props) {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  useEffect(() => {
    if (!socket || !excalidrawAPI) return;

    // Écouter les changements des autres participants
    socket.on('whiteboard:update', (data) => {
      excalidrawAPI.updateScene(data);
    });

    return () => socket.off('whiteboard:update');
  }, [socket, excalidrawAPI]);

  const handleChange = (elements, appState) => {
    // Envoyer les changements aux autres participants
    socket?.emit('whiteboard:update', {
      sessionId,
      elements,
      appState
    });
  };

  return (
    <Excalidraw
      ref={(api) => setExcalidrawAPI(api)}
      onChange={handleChange}
      initialData={{ elements: [], appState: {} }}
    />
  );
}
```

---

### 9. Recherche Globale Avancée 🔍
**Impact** : Élevé  
**Effort** : 3-4 jours  

#### Fonctionnalités :
- Recherche omnipresente (Cmd/Ctrl + K)
- Recherche dans : cours, ressources, étudiants, documents, annonces
- Filtres avancés
- Suggestions de recherche
- Historique de recherche

```typescript
// frontend/src/components/search/GlobalSearch.tsx
import { Command } from 'cmdk';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <Command.Dialog open={open} onOpenChange={setOpen}>
      <Command.Input
        value={search}
        onValueChange={setSearch}
        placeholder="Rechercher cours, étudiants, documents..."
      />
      <Command.List>
        <Command.Group heading="Cours">
          {courses.map((course) => (
            <Command.Item key={course.id}>
              {course.name}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Étudiants">
          {students.map((student) => (
            <Command.Item key={student.id}>
              {student.full_name}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

---

### 10. Drag & Drop pour Upload de Fichiers 📤
**Impact** : Moyen  
**Effort** : 1-2 jours  

#### Zones à améliorer :
- Upload de ressources pédagogiques
- Dépôt de devoirs
- Soumission de documents administratifs
- Upload photo de profil

```typescript
// frontend/src/components/ui/FileDropzone.tsx
import { useDropzone } from 'react-dropzone';

export function FileDropzone({ onFilesAdded, accept, maxSize, multiple = true }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxSize,
    multiple,
    onDrop: (acceptedFiles) => {
      onFilesAdded(acceptedFiles);
    }
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition",
        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
      )}
    >
      <input {...getInputProps()} />
      <UploadCloud className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      {isDragActive ? (
        <p>Déposez les fichiers ici...</p>
      ) : (
        <p>Glissez-déposez des fichiers ici, ou cliquez pour sélectionner</p>
      )}
    </div>
  );
}
```

---

## 📊 TABLEAU RÉCAPITULATIF DES AMÉLIORATIONS

| # | Fonctionnalité | Priorité | Impact | Effort | Gain conformité |
|---|----------------|----------|--------|--------|-----------------|
| 1 | Parents/Tuteurs | 🔴 Haute | Moyen | 2-3j | +3% |
| 2 | WebSocket temps réel | 🔴 Haute | Élevé | 5-7j | +5% |
| 3 | PWA complète | 🔴 Haute | Moyen | 3-5j | +2% |
| 4 | Transferts/Mobilité | 🟡 Moyenne | Moyen | 3-4j | +2% |
| 5 | Webhooks HTTP | 🟡 Moyenne | Moyen | 3-4j | +1% |
| 6 | Anti-Plagiat | 🟡 Moyenne | Moyen | 2-3j | +1% |
| 7 | Mode sombre | 🔵 Basse | Élevé UX | 2-3j | 0% (UX) |
| 8 | Tableau blanc | 🔵 Basse | Moyen UX | 5-7j | 0% (UX) |
| 9 | Recherche globale | 🔵 Basse | Élevé UX | 3-4j | 0% (UX) |
| 10 | Drag & Drop | 🔵 Basse | Moyen UX | 1-2j | 0% (UX) |

**Conformité cible après P1** : 94.2% + 10% = **98.2%** ✅  
**Durée totale P1** : 10-15 jours  
**Durée totale P1+P2** : 20-30 jours  
**Durée totale P1+P2+P3** : 30-45 jours  

---

## 🎯 ROADMAP D'IMPLÉMENTATION

### Sprint 1 (Semaine 1-2) : Fondations
- ✅ Module Parents/Tuteurs (backend + frontend)
- ✅ PWA complète (service workers + manifest)
- ✅ Mode sombre/clair

### Sprint 2 (Semaine 3-4) : Temps Réel
- ✅ WebSocket backend (Django Channels)
- ✅ WebSocket frontend (Socket.io client)
- ✅ Notifications temps réel
- ✅ Online presence indicators

### Sprint 3 (Semaine 5-6) : Workflows
- ✅ Workflow transferts/mobilité
- ✅ Webhooks HTTP
- ✅ Drag & Drop upload

### Sprint 4 (Semaine 7-8) : Intégrations
- ✅ Anti-plagiat (API externe)
- ✅ Recherche globale avancée
- ✅ Tableau blanc collaboratif (Excalidraw)

---

**Document créé le** : Juillet 2026  
**Auteur** : TIRAHOU  
**Version cible** : 1.3.0 → 1.5.0  
**Objectif** : **98%+ de conformité + UX exceptionnelle** 🚀

