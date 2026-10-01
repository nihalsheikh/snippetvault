export type Language =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'rust'
  | 'go'
  | 'sql'
  | 'bash'
  | 'json'
  | 'yaml'
  | 'css'
  | 'html'
  | 'java'
  | 'c'
  | 'cpp'
  | 'ruby'
  | 'php'
  | 'swift'
  | 'kotlin'
  | 'other'

export type Visibility = 'public' | 'private'

export interface Author {
  id: string
  name: string
  username: string
  initials: string
  avatarGradient?: string
}

export interface Snippet {
  id: string
  title: string
  description: string
  code: string
  language: Language
  tags: string[]
  visibility: Visibility
  author: Author
  copies: number
  favourited?: boolean
  isTrending?: boolean
  aiExplanation?: string
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  author: Author
  body: string
  createdAt: string
}