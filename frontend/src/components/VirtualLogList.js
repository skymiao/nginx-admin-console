import React from 'react';
import { Button } from 'antd';

const VirtualLogList = ({ 
  lines, 
  expandedLogs, 
  setExpandedLogs, 
  lineHeight = 40,
  expandedLineHeight = 120,
}) => {
  if (lines.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>暂无日志</div>;
  }

  return (
    <div style={{ height: 600, overflowY: 'auto' }}>
      {lines.map((line, index) => {
        const isExpanded = expandedLogs[`log-${index}`];
        const isLongLine = line.length > 300;

        return (
          <div
            key={index}
            style={{
              borderBottom: '1px solid #F1F5F9',
              fontFamily: 'monospace',
              fontSize: 13,
              padding: '12px 16px',
              minHeight: lineHeight,
            }}
          >
            <div style={{
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              flexWrap: 'nowrap',
              overflow: 'hidden',
            }}>
              <span style={{ 
                color: '#1E293B', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap', 
                fontWeight: 500, 
                flexShrink: 1 
              }}>
                {isLongLine && !isExpanded ? `${line.substring(0, 300)}...` : line}
              </span>
              {isLongLine && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => setExpandedLogs(prev => ({ ...prev, [`log-${index}`]: !isExpanded }))}
                  style={{ padding: 0, height: 'auto', flexShrink: 0 }}
                >
                  {isExpanded ? '收起' : '查看'}
                </Button>
              )}
            </div>
            {isLongLine && isExpanded && (
              <div style={{
                marginTop: 8,
                padding: '12px',
                backgroundColor: '#F8FAFC',
                borderRadius: 4,
                wordBreak: 'break-all',
                whiteSpace: 'pre-wrap',
                fontSize: 13,
              }}>
                {line}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default VirtualLogList;
