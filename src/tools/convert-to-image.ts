import { z } from 'zod'
import { ConvertToImageRequestSchema } from '../types.js'
import { MermaidService } from '../mermaid-service.js'

const mermaidService = new MermaidService()

export const convertToImageTool = {
    name: 'convert_to_image',
    description: 'Convert a Mermaid diagram to PNG, JPG, or PDF image format',
    inputSchema: ConvertToImageRequestSchema,
    execute: async (params: z.infer<typeof ConvertToImageRequestSchema>) => {
        try {
            const result = await mermaidService.convertToImage(params)

            if (!result.success) {
                throw new Error(result.error || 'Failed to convert diagram to image')
            }

            return {
                success: true,
                data: result.data,
                format: result.format,
                size: result.size
            }
        } catch (error) {
            throw new Error(`Failed to convert diagram to image: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
} 