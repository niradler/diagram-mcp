import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { MermaidService } from '../src/mermaid-service.js'

describe('MermaidService', () => {
    let service: MermaidService

    beforeAll(async () => {
        service = new MermaidService()
        await service.initialize()
    })

    afterAll(async () => {
        await service.cleanup()
    })

    it('should render a simple flowchart to SVG', async () => {
        const mermaidCode = `
      graph TD
        A[Start] --> B{Is it working?}
        B -->|Yes| C[Great!]
        B -->|No| D[Debug]
        D --> B
    `

        const result = await service.renderDiagram({
            mermaidCode,
            format: 'svg',
            theme: 'default'
        })

        expect(result.success).toBe(true)
        expect(result.data).toBeDefined()
        expect(result.format).toBe('svg')
        expect(result.data).toContain('<svg')
    })

    it('should convert a flowchart to PNG', async () => {
        const mermaidCode = `
      graph LR
        A[Input] --> B[Process]
        B --> C[Output]
    `

        const result = await service.convertToImage({
            mermaidCode,
            format: 'png',
            theme: 'default',
            quality: 90
        })

        expect(result.success).toBe(true)
        expect(result.data).toBeDefined()
        expect(result.format).toBe('png')
        expect(result.size).toBeDefined()
    })

    it('should handle invalid Mermaid code gracefully', async () => {
        const invalidCode = 'invalid mermaid syntax'

        const result = await service.renderDiagram({
            mermaidCode: invalidCode,
            format: 'svg',
            theme: 'default'
        })

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
    })
}) 