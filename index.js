import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import plantuml from 'node-plantuml';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class PlantUMLServer {
  constructor() {
    this.server = new Server(
      {
        name: 'plantuml-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    
    // 确保输出目录存在
    this.outputDir = path.join(__dirname, 'output');
    this.ensureOutputDir();
  }

  async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create output directory:', error);
    }
  }

  setupHandlers() {
    // 列出可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'render_plantuml',
          description: 'Render PlantUML text to image',
          inputSchema: {
            type: 'object',
            properties: {
              plantuml_text: {
                type: 'string',
                description: 'PlantUML diagram text',
              },
              format: {
                type: 'string',
                description: 'Output format (png, svg, txt)',
                enum: ['png', 'svg', 'txt'],
                default: 'png',
              },
              output_path: {
                type: 'string',
                description: 'Optional output file path',
              },
            },
            required: ['plantuml_text'],
          },
        },
        {
          name: 'render_plantuml_from_file',
          description: 'Render PlantUML from file',
          inputSchema: {
            type: 'object',
            properties: {
              input_path: {
                type: 'string',
                description: 'Path to PlantUML file',
              },
              format: {
                type: 'string',
                description: 'Output format (png, svg, txt)',
                enum: ['png', 'svg', 'txt'],
                default: 'png',
              },
              output_path: {
                type: 'string',
                description: 'Optional output file path',
              },
            },
            required: ['input_path'],
          },
        },
        {
          name: 'validate_plantuml',
          description: 'Validate PlantUML syntax',
          inputSchema: {
            type: 'object',
            properties: {
              plantuml_text: {
                type: 'string',
                description: 'PlantUML diagram text to validate',
              },
            },
            required: ['plantuml_text'],
          },
        },
      ],
    }));

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'render_plantuml':
          return await this.renderPlantUML(request.params.arguments);
        case 'render_plantuml_from_file':
          return await this.renderPlantUMLFromFile(request.params.arguments);
        case 'validate_plantuml':
          return await this.validatePlantUML(request.params.arguments);
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  async renderPlantUML(args) {
    const { plantuml_text, format = 'png', output_path } = args;

    try {
      // 生成唯一文件名
      const hash = crypto.createHash('md5').update(plantuml_text).digest('hex');
      const timestamp = Date.now();
      const filename = `diagram_${hash}_${timestamp}.${format}`;
      const finalPath = output_path || path.join(this.outputDir, filename);

      // 创建PlantUML生成器
      const gen = plantuml.generate(plantuml_text, { 
        format: format,
        charset: 'UTF-8'
      });

      // 收集输出
      const chunks = [];
      return new Promise((resolve, reject) => {
        gen.out.on('data', (chunk) => chunks.push(chunk));
        gen.out.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            
            // 保存到文件
            await fs.writeFile(finalPath, buffer);

            // 如果是图片格式，返回base64编码
            let base64 = null;
            if (format === 'png' || format === 'svg') {
              base64 = buffer.toString('base64');
            }

            resolve({
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    path: finalPath,
                    format: format,
                    size: buffer.length,
                    base64: base64 ? `data:image/${format};base64,${base64}` : null,
                  }, null, 2),
                },
              ],
            });
          } catch (error) {
            reject(error);
          }
        });

        gen.out.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
            }, null, 2),
          },
        ],
      };
    }
  }

  async renderPlantUMLFromFile(args) {
    const { input_path, format = 'png', output_path } = args;

    try {
      // 读取文件内容
      const plantuml_text = await fs.readFile(input_path, 'utf-8');
      
      // 使用现有的渲染方法
      return await this.renderPlantUML({
        plantuml_text,
        format,
        output_path: output_path || input_path.replace(/\.[^/.]+$/, `.${format}`),
      });
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Failed to read file: ${error.message}`,
            }, null, 2),
          },
        ],
      };
    }
  }

  async validatePlantUML(args) {
    const { plantuml_text } = args;

    try {
      // 基本语法验证
      const validationRules = [
        {
          pattern: /^@start(uml|salt|wbs|mindmap|gantt|json|yaml|creole|ditaa|dot)/m,
          message: 'Missing @start directive',
        },
        {
          pattern: /^@end(uml|salt|wbs|mindmap|gantt|json|yaml|creole|ditaa|dot)/m,
          message: 'Missing @end directive',
        },
      ];

      const issues = [];
      for (const rule of validationRules) {
        if (!rule.pattern.test(plantuml_text)) {
          issues.push(rule.message);
        }
      }

      // 尝试生成文本格式来验证语法
      try {
        const gen = plantuml.generate(plantuml_text, { format: 'txt' });
        
        return new Promise((resolve) => {
          const chunks = [];
          gen.out.on('data', (chunk) => chunks.push(chunk));
          gen.out.on('end', () => {
            const output = Buffer.concat(chunks).toString();
            
            // 检查是否有错误信息
            const hasError = output.includes('Error') || output.includes('Syntax');
            
            resolve({
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    valid: !hasError && issues.length === 0,
                    issues: issues,
                    message: hasError ? 'PlantUML syntax error detected' : 
                            issues.length > 0 ? 'Validation issues found' : 
                            'PlantUML syntax is valid',
                  }, null, 2),
                },
              ],
            });
          });
          
          gen.out.on('error', () => {
            resolve({
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    valid: false,
                    issues: [...issues, 'Failed to parse PlantUML'],
                    message: 'Invalid PlantUML syntax',
                  }, null, 2),
                },
              ],
            });
          });
        });
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                valid: false,
                issues: [...issues, error.message],
                message: 'Invalid PlantUML syntax',
              }, null, 2),
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
            }, null, 2),
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('PlantUML MCP server running on stdio');
  }
}

// 启动服务器
const server = new PlantUMLServer();
server.run().catch(console.error);