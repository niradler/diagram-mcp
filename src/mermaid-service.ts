import mermaid from 'mermaid'
import puppeteer, { Browser, ScreenshotOptions } from 'puppeteer'
import { RenderDiagramRequest, ConvertToImageRequest, DiagramResult } from './types'

export class MermaidService {
    private browser: Browser | null = null

    async initialize() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            })
        }
    }

    async renderDiagram(request: RenderDiagramRequest): Promise<DiagramResult> {
        try {
            await this.initialize()

            const { mermaidCode, format, theme, backgroundColor, width, height } = request

            if (!this.browser) {
                throw new Error('Browser not initialized')
            }

            const page = await this.browser.newPage()

            // Create HTML with Mermaid script
            const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
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
            mermaid.initialize({
              theme: '${theme}',
              startOnLoad: true,
              securityLevel: 'loose',
              fontFamily: 'Arial, sans-serif'
            });
          </script>
        </body>
        </html>
      `

            await page.setContent(html)

            // Wait for Mermaid to render
            await page.waitForFunction(() => {
                const diagram = document.querySelector('.mermaid svg');
                return diagram !== null;
            }, { timeout: 10000 });

            if (format === 'svg') {
                const svgElement = await page.$('.mermaid svg');
                if (!svgElement) {
                    throw new Error('SVG element not found');
                }
                const svgContent = await page.evaluate((element) => element.outerHTML, svgElement);
                await page.close();

                return {
                    success: true,
                    data: svgContent,
                    format: 'svg'
                }
            }

            const element = await page.$('.diagram')
            if (!element) {
                throw new Error('Diagram element not found')
            }

            const boundingBox = await element.boundingBox()
            if (!boundingBox) {
                throw new Error('Could not get diagram dimensions')
            }

            let buffer: Buffer

            if (format === 'pdf') {
                buffer = await page.pdf({
                    format: 'A4',
                    printBackground: true
                })
            } else {
                const screenshotOptions: ScreenshotOptions = {
                    type: 'png',
                    fullPage: false,
                    clip: {
                        x: boundingBox.x,
                        y: boundingBox.y,
                        width: width || boundingBox.width,
                        height: height || boundingBox.height
                    }
                }
                buffer = await page.screenshot(screenshotOptions)
            }

            await page.close()

            return {
                success: true,
                data: buffer.toString('base64'),
                format: format,
                size: {
                    width: width || boundingBox.width,
                    height: height || boundingBox.height
                }
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                format: request.format
            }
        }
    }

    async convertToImage(request: ConvertToImageRequest): Promise<DiagramResult> {
        try {
            await this.initialize()

            const { mermaidCode, format, theme, backgroundColor, width, height, quality } = request

            if (!this.browser) {
                throw new Error('Browser not initialized')
            }

            const page = await this.browser.newPage()

            // Create HTML with Mermaid script
            const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
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
            mermaid.initialize({
              theme: '${theme}',
              startOnLoad: true,
              securityLevel: 'loose',
              fontFamily: 'Arial, sans-serif'
            });
          </script>
        </body>
        </html>
      `

            await page.setContent(html)

            // Wait for Mermaid to render
            await page.waitForFunction(() => {
                const diagram = document.querySelector('.mermaid svg');
                return diagram !== null;
            }, { timeout: 10000 });

            const element = await page.$('.diagram')
            if (!element) {
                throw new Error('Diagram element not found')
            }

            const boundingBox = await element.boundingBox()
            if (!boundingBox) {
                throw new Error('Could not get diagram dimensions')
            }

            let buffer: Buffer

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
                buffer = await page.screenshot(screenshotOptions)
            }

            await page.close()

            return {
                success: true,
                data: buffer.toString('base64'),
                format: format,
                size: {
                    width: width || boundingBox.width,
                    height: height || boundingBox.height
                }
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
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