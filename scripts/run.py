#!/usr/bin/env python3
"""
搬屎机器人启动入口
Reddit 弱智内容自动采集与 Telegram 推送

这是项目的主要入口点，调用 src/ 目录下的模块。
"""

import sys
import os

# 将 src 目录添加到 Python 路径
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src_dir = os.path.join(project_root, 'src')
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from main import main

if __name__ == "__main__":
    main()
