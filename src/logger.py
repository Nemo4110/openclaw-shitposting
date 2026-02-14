"""
日志配置模块
提供带文件路径和行号的日志格式
"""

import logging
import sys


def setup_logger(name: str = None, level: int = logging.INFO) -> logging.Logger:
    """
    配置并返回一个带文件路径和行号的日志记录器
    
    Args:
        name: 日志记录器名称，默认为None（根记录器）
        level: 日志级别
    
    Returns:
        配置好的 Logger 实例
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # 避免重复添加处理器
    if logger.handlers:
        return logger
    
    # 禁用日志传播到父 logger，避免重复打印
    logger.propagate = False
    
    # 创建控制台处理器
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    
    # 设置格式：时间 - 文件名:行号 - 级别 - 消息
    formatter = logging.Formatter(
        fmt='%(asctime)s - %(filename)s:%(lineno)d - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    
    logger.addHandler(handler)
    return logger


# 默认日志记录器
default_logger = setup_logger()
