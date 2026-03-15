interface Perk {
  name: string
  description: string
  iconUrl: string
}

interface Character {
  id: string
  name: string
  role: "killer" | "survivor"
  gender: "male" | "female" | "nonbinary"
  origin: "original" | "licensed"
  license?: string
  chapter: number
  releaseYear: number

  // Clássico — killers
  moveSpeed?: number
  terrorRadius?: number
  powerCategory?: string

  // Clássico — survivors
  difficulty?: "easy" | "intermediate" | "hard"

  // Perks
  perks: Perk[]

  // Zoom
  portraitUrl: string

  // Terror Radius
  terrorRadiusAudioUrl?: string  // só killers
}