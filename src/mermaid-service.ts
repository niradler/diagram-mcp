import puppeteer, { Browser, ScreenshotOptions } from 'puppeteer'
import assert from 'assert'
import { RenderDiagramRequest, ConvertToImageRequest, DiagramResult } from './types'

export class MermaidService {
    private browser: Browser | null = null

    async initialize() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            })
            assert(this.browser, 'Browser must be initialized')
        }
    }

    async renderDiagram(request: RenderDiagramRequest): Promise<DiagramResult> {
        try {
            assert(request, 'Request is required')
            assert(request.mermaidCode, 'Mermaid code is required')
            assert(request.mermaidCode.trim().length > 0, 'Mermaid code cannot be empty')
            assert(['svg', 'png', 'jpg', 'pdf'].includes(request.format), `Invalid format: ${request.format}`)
            assert(['default', 'base', 'dark', 'forest', 'neutral', 'null'].includes(request.theme), `Invalid theme: ${request.theme}`)

            await this.initialize()
            assert(this.browser, 'Browser must be initialized')

            const {
                mermaidCode,
                format,
                theme,
                backgroundColor,
                width,
                height,
                quality,
                filePath,
                fontFamily,
                fontSize,
                darkMode,
                htmlLabels,
                maxTextSize,
                flowchart,
                sequence
            } = request

            if (width !== undefined) {
                assert(width > 0, `Width must be positive, got: ${width}`)
            }
            
            if (height !== undefined) {
                assert(height > 0, `Height must be positive, got: ${height}`)
            }
            
            if (quality !== undefined) {
                assert(quality >= 1 && quality <= 100, `Quality must be between 1 and 100, got: ${quality}`)
            }
            
            if (fontSize !== undefined) {
                assert(fontSize > 0, `Font size must be positive, got: ${fontSize}`)
            }
            
            if (maxTextSize !== undefined) {
                assert(maxTextSize > 0, `Max text size must be positive, got: ${maxTextSize}`)
            }

            const page = await this.browser.newPage()
            assert(page, 'Page must be created')

            const mermaidConfig = {
                theme: theme,
                startOnLoad: true,
                securityLevel: 'loose',
                fontFamily: fontFamily || 'Arial, sans-serif',
                fontSize: fontSize,
                darkMode: darkMode,
                htmlLabels: htmlLabels,
                maxTextSize: maxTextSize,
                flowchart: flowchart,
                sequence: sequence
            }

            const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
          <style>
            body { margin: 0; padding: 20px; background: ${backgroundColor || '#ffffff'}; }
            .diagram { display: flex; justify-content: center; align-items: center; }
          </style>
        </head>
        <body>
          <div class="diagram">
            <div class="mermaid">
              ${mermaidCode}
            </div>
          </div>
          <script>
            mermaid.initialize(${JSON.stringify(mermaidConfig)});
          </script>
        </body>
        </html>
      `

            await page.setContent(html)

            const renderResult = await page.waitForFunction(() => {
                const diagram = document.querySelector('.mermaid svg');
                const errorElement = document.querySelector('.error-text');
                return {
                    hasDiagram: diagram !== null,
                    hasError: errorElement !== null,
                    errorText: errorElement ? errorElement.textContent : null
                };
            }, { timeout: 10000 });

            const result = await renderResult.jsonValue() as { hasDiagram: boolean; hasError: boolean; errorText: string | null };
            assert(result, 'Render result must be returned')
            assert(typeof result.hasDiagram === 'boolean', 'hasDiagram must be boolean')
            assert(typeof result.hasError === 'boolean', 'hasError must be boolean')

            if (result.hasError) {
                assert(result.errorText, 'Error text must be provided when hasError is true')
                throw new Error(`Mermaid syntax error: ${result.errorText || 'Unknown syntax error'}`);
            }

            if (format === 'svg') {
                const svgElement = await page.$('.mermaid svg');
                assert(svgElement, 'SVG element must be found for SVG format')
                const svgContent = await page.evaluate((element) => element.outerHTML, svgElement);
                assert(svgContent, 'SVG content must be generated')
                await page.close();

                return {
                    success: true,
                    data: svgContent,
                    format: 'svg'
                }
            }

            const element = await page.$('.diagram')
            assert(element, 'Diagram element must be found')

            const boundingBox = await element.boundingBox()
            assert(boundingBox, 'Diagram bounding box must be obtained')
            assert(boundingBox.width > 0, 'Bounding box width must be positive')
            assert(boundingBox.height > 0, 'Bounding box height must be positive')

            let buffer: Uint8Array

            if (format === 'pdf') {
                buffer = await page.pdf({
                    format: 'A4',
                    printBackground: true
                })
            } else {
                const screenshotOptions: ScreenshotOptions = {
                    type: format === 'jpg' ? 'jpeg' : 'png',
                    quality: format === 'jpg' ? (quality || 90) : undefined,
                    fullPage: false,
                    clip: {
                        x: boundingBox.x,
                        y: boundingBox.y,
                        width: width || boundingBox.width,
                        height: height || boundingBox.height
                    }
                }

                if (filePath) {
                    const extension = format === 'jpg' ? '.jpeg' : `.${format}`
                    const pathWithExtension = filePath.endsWith(extension) ? filePath : `${filePath}${extension}`
                    screenshotOptions.path = pathWithExtension as `${string}.png` | `${string}.jpeg` | `${string}.webp`
                }

                buffer = await page.screenshot(screenshotOptions)
            }

            assert(buffer, 'Buffer must be generated')
            assert(buffer.length > 0, 'Buffer must not be empty')

            await page.close()

            return {
                success: true,
                data: Buffer.from(buffer).toString('base64'),
                format: format,
                size: {
                    width: width || boundingBox.width,
                    height: height || boundingBox.height
                }
            }
        } catch (error) {
            assert(error, 'Error must be provided')
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            return {
                success: false,
                error: errorMessage,
                format: request.format
            }
        }
    }

    async convertToImage(request: ConvertToImageRequest): Promise<DiagramResult> {
        try {
            assert(request, 'Request is required')
            assert(request.mermaidCode, 'Mermaid code is required')
            assert(request.mermaidCode.trim().length > 0, 'Mermaid code cannot be empty')
            assert(['svg', 'png', 'jpg', 'pdf'].includes(request.format), `Invalid format: ${request.format}`)
            assert(['default', 'base', 'dark', 'forest', 'neutral', 'null'].includes(request.theme), `Invalid theme: ${request.theme}`)

            await this.initialize()
            assert(this.browser, 'Browser must be initialized')

            const {
                mermaidCode,
                format,
                theme,
                backgroundColor,
                width,
                height,
                quality,
                filePath,
                fontFamily,
                fontSize,
                darkMode,
                htmlLabels,
                maxTextSize,
                flowchart,
                sequence
            } = request

            if (width !== undefined) {
                assert(width > 0, `Width must be positive, got: ${width}`)
            }
            
            if (height !== undefined) {
                assert(height > 0, `Height must be positive, got: ${height}`)
            }
            
            if (quality !== undefined) {
                assert(quality >= 1 && quality <= 100, `Quality must be between 1 and 100, got: ${quality}`)
            }
            
            if (fontSize !== undefined) {
                assert(fontSize > 0, `Font size must be positive, got: ${fontSize}`)
            }
            
            if (maxTextSize !== undefined) {
                assert(maxTextSize > 0, `Max text size must be positive, got: ${maxTextSize}`)
            }

            const page = await this.browser.newPage()
            assert(page, 'Page must be created')

            const mermaidConfig = {
                theme: theme,
                startOnLoad: true,
                securityLevel: 'loose',
                fontFamily: fontFamily || 'Arial, sans-serif',
                fontSize: fontSize,
                darkMode: darkMode,
                htmlLabels: htmlLabels,
                maxTextSize: maxTextSize,
                flowchart: flowchart,
                sequence: sequence
            }

            const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
          <style>
            body { margin: 0; padding: 20px; background: ${backgroundColor || '#ffffff'}; }
            .diagram { display: flex; justify-content: center; align-items: center; }
          </style>
        </head>
        <body>
          <div class="diagram">
            <div class="mermaid">
              ${mermaidCode}
            </div>
          </div>
          <script>
            mermaid.initialize(${JSON.stringify(mermaidConfig)});
          </script>
        </body>
        </html>
      `

            await page.setContent(html)

            const renderResult = await page.waitForFunction(() => {
                const diagram = document.querySelector('.mermaid svg');
                const errorElement = document.querySelector('.error-text');
                return {
                    hasDiagram: diagram !== null,
                    hasError: errorElement !== null,
                    errorText: errorElement ? errorElement.textContent : null
                };
            }, { timeout: 10000 });

            const result = await renderResult.jsonValue() as { hasDiagram: boolean; hasError: boolean; errorText: string | null };
            assert(result, 'Render result must be returned')
            assert(typeof result.hasDiagram === 'boolean', 'hasDiagram must be boolean')
            assert(typeof result.hasError === 'boolean', 'hasError must be boolean')

            if (result.hasError) {
                assert(result.errorText, 'Error text must be provided when hasError is true')
                throw new Error(`Mermaid syntax error: ${result.errorText || 'Unknown syntax error'}`);
            }

            const element = await page.$('.diagram')
            assert(element, 'Diagram element must be found')

            const boundingBox = await element.boundingBox()
            assert(boundingBox, 'Diagram bounding box must be obtained')
            assert(boundingBox.width > 0, 'Bounding box width must be positive')
            assert(boundingBox.height > 0, 'Bounding box height must be positive')

            let buffer: Uint8Array

            if (format === 'pdf') {
                buffer = await page.pdf({
                    format: 'A4',
                    printBackground: true
                })
            } else {
                const screenshotOptions: ScreenshotOptions = {
                    type: format === 'jpg' ? 'jpeg' : 'png',
                    quality: quality,
                    fullPage: false,
                    clip: {
                        x: boundingBox.x,
                        y: boundingBox.y,
                        width: width || boundingBox.width,
                        height: height || boundingBox.height
                    }
                }

                if (filePath) {
                    const extension = format === 'jpg' ? '.jpeg' : `.${format}`
                    const pathWithExtension = filePath.endsWith(extension) ? filePath : `${filePath}${extension}`
                    screenshotOptions.path = pathWithExtension as `${string}.png` | `${string}.jpeg` | `${string}.webp`
                }

                buffer = await page.screenshot(screenshotOptions)
            }

            assert(buffer, 'Buffer must be generated')
            assert(buffer.length > 0, 'Buffer must not be empty')

            await page.close()

            return {
                success: true,
                data: Buffer.from(buffer).toString('base64'),
                format: format,
                size: {
                    width: width || boundingBox.width,
                    height: height || boundingBox.height
                }
            }
        } catch (error) {
            assert(error, 'Error must be provided')
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            return {
                success: false,
                error: errorMessage,
                format: request.format
            }
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close()
            this.browser = null
        }
    }
} 