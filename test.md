// 测试用例示例
{
  "test_cases": [
    {
      "name": "简单序列图",
      "plantuml_text": "@startuml\nAlice -> Bob: Hello\nBob -> Alice: Hi!\n@enduml",
      "format": "png"
    },
    {
      "name": "类图",
      "plantuml_text": "@startuml\nclass User {\n  -String name\n  -int age\n  +getName()\n  +setName()\n}\n@enduml",
      "format": "svg"
    },
    {
      "name": "流程图",
      "plantuml_text": "@startuml\nstart\n:初始化;\n:处理数据;\nif (成功?) then (yes)\n  :保存结果;\nelse (no)\n  :错误处理;\nendif\nstop\n@enduml",
      "format": "png"
    }
  ]
}