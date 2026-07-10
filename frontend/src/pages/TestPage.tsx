export default function TestPage() {
  return (
    <div style={{ padding: '40px', backgroundColor: '#fff', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#000', marginBottom: '20px' }}>
        ✅ TEST PAGE FONCTIONNE
      </h1>
      <p style={{ fontSize: '18px', color: '#666', marginBottom: '10px' }}>
        Si vous voyez cette page, React fonctionne correctement.
      </p>
      <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
        <p style={{ color: '#1976d2', fontWeight: 'bold' }}>
          Le problème du dashboard vide vient d'ailleurs.
        </p>
      </div>
    </div>
  )
}
