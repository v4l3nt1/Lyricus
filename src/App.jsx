import { useState, useEffect } from 'react'
import './App.css'

// Importe tous les fichiers du dossier songs
const songModules = import.meta.glob('./songs/*.txt', { as: 'raw' })
const songFiles = Object.keys(songModules)

// Découpe les mots sur les tirets (ex: "ramène-les" devient "ramène" et "les").
// Les caractères spéciaux et tirets peuvent être masqués et devinés.
function splitWords(line) {
  // Découpe sur les espaces et tirets, garde les caractères spéciaux comme mots séparés
  return line
    .split(/\s+/)
    .flatMap(word =>
      word
        .split(/(-)/) // découpe sur les tirets, garde les tirets comme mots
        .filter(w => w !== '')
    )
}

// Masque chaque mot de certaines lignes (ex: 15 lignes aléatoires)
function maskRandomWords(text, count = 30) {
  const lines = text.split('\n')
  if (lines.length === 0) return { masked: [], maskedWords: [] }
  // Sélectionne des indices uniques de lignes à masquer
  const indices = new Set()
  while (indices.size < Math.min(count, lines.length)) {
    indices.add(Math.floor(Math.random() * lines.length))
  }
  // Stocke tous les mots masqués pour la vérification
  const maskedWords = []
  const masked = lines.map((line, idx) => {
    const words = splitWords(line)
    if (indices.has(idx)) {
      maskedWords.push(...words.filter(w => w.trim() !== ''))
      return words.map((word, widx) => ({
        masked: true,
        value: word,
        lineIdx: idx,
        wordIdx: widx
      }))
    }
    // Ligne non masquée
    return words.map((word, widx) => ({
      masked: false,
      value: word,
      lineIdx: idx,
      wordIdx: widx
    }))
  })
  return { masked, maskedWords }
}

// Normalise pour la comparaison (minuscules, sans accents, garde tirets, retire autres caractères spéciaux)
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // retire les accents
    .replace(/[^a-z0-9-]/gi, '') // garde les tirets, retire autres caractères spéciaux
}

function App() {
  const [songText, setSongText] = useState('Loading...')
  const [maskedLines, setMaskedLines] = useState([])
  const [maskedWords, setMaskedWords] = useState([])
  const [revealed, setRevealed] = useState({})
  const [input, setInput] = useState('')
  const [shouldClearInput, setShouldClearInput] = useState(false)

  useEffect(() => {
    if (songFiles.length === 0) {
      setSongText('No songs found')
      return
    }
    const randomFile = songFiles[Math.floor(Math.random() * songFiles.length)]
    songModules[randomFile]().then(text => {
      setSongText(text)
      const { masked, maskedWords } = maskRandomWords(text)
      setMaskedLines(masked)
      setMaskedWords(maskedWords)
      setRevealed({})
    }).catch(() => setSongText('Failed to load song'))
  }, [])

  const handleInputChange = (e) => {
    const rawInput = e.target.value;
    const val = normalize(rawInput.trim());

    // Cherche les mots masqués non encore révélés correspondant à la saisie
    const newlyFound = maskedWords.filter(word => normalize(word) === val && !revealed[word]);

    if (newlyFound.length > 0) {
      // Révèle tous les mots trouvés
      setRevealed(prev => {
        const newRevealed = { ...prev }
        newlyFound.forEach(word => {
          newRevealed[word] = true
        })
        return newRevealed
      })
      setInput('') // Vide le champ
    } else {
      setInput(rawInput)
    }
  };

  // Effet pour vider le champ après la révélation
  useEffect(() => {
    if (shouldClearInput) {
      setInput('')
      setShouldClearInput(false)
    }
  }, [shouldClearInput])

  // Affiche le texte avec masques et révélations mot par mot
  function renderMaskedText() {
    if (!Array.isArray(maskedLines) || maskedLines.length === 0) return songText
    const result = []
    for (let idx = 0; idx < maskedLines.length; idx++) {
      const line = maskedLines[idx]
      line.forEach((wordObj, widx) => {
        if (wordObj.masked) {
          if (revealed[wordObj.value]) {
            result.push(
              <span key={`${idx}-${widx}`}>{wordObj.value}</span>
            )
          } else {
            // Largeur du masque = nombre de caractères du mot (min 2ch)
            const len = wordObj.value.length
            result.push(
              <span
                key={`${idx}-${widx}`}
                style={{
                  background: '#444',
                  color: 'transparent', // rend le texte invisible
                  borderRadius: '4px',
                  padding: '0 0.2em',
                  margin: '0 0.1em',
                  userSelect: 'none',
                  display: 'inline-block',
                  width: `${len}ch`, // largeur exacte selon la longueur du mot
                  textAlign: 'center'
                }}
                aria-label="mot masqué"
              >
                {wordObj.value}
              </span>
            )
          }
        } else {
          result.push(<span key={`${idx}-${widx}`}>{wordObj.value}</span>)
        }
        // Ajoute un espace sauf après le dernier mot de la ligne
        if (widx < line.length - 1) result.push(' ')
      })
      // Retour à la ligne sauf après la dernière ligne
      if (idx < maskedLines.length - 1) result.push(<br key={`br-${idx}`} />)
    }
    return result
  }

  return (
    <div>
      <h1>Song Lyrics</h1>
      <input
        type="text"
        placeholder="Devine un mot masqué…"
        value={input}
        onChange={handleInputChange}
        style={{
          marginBottom: '1em',
          padding: '0.5em',
          fontSize: '1em',
          width: '80%',
          maxWidth: '400px',
          borderRadius: '4px',
          border: '1px solid #888'
        }}
      />
      <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap' }}>
        {renderMaskedText()}
      </pre>
    </div>
  )
}

export default App
