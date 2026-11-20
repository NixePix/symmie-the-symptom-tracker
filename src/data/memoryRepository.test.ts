import { describeDiaryRepository } from './repositoryContract'
import { memoryRepository } from './memoryRepository'

describeDiaryRepository('memoryRepository', () => memoryRepository())
