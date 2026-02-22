import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Tabs,
  Button,
  InputNumber,
  Space,
  message,
  Spin,
  Empty,
  Tag,
  Select,
  Row,
  Col,
  Divider,
  Input,
  Tooltip,
  Statistic,
  Badge,
  Alert,
  Radio,
  Modal,
  Form,
  Popconfirm,
  Pagination,
} from 'antd';
import {
  ReloadOutlined,
  FileTextOutlined,
  WarningOutlined,
  SearchOutlined,
  FolderOutlined,
  ClearOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoOutlined,
  LineChartOutlined,
  CloudServerOutlined,
  DownOutlined,
  RightOutlined,
  BgColorsOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { logAPI, serverAPI } from '../services/api';

const { Option } = Select;
const { TextArea } = Input;

const COLUMN_DEFINITIONS = {
  ip: {
    label: 'IP地址',
    key: 'ip',
    width: 120,
    minWidth: 120,
  },
  time: {
    label: '时间',
    key: 'time',
    width: 160,
    minWidth: 160,
  },
  method: {
    label: '请求方法',
    key: 'method',
    width: 70,
    minWidth: 70,
  },
  path: {
    label: '请求路径',
    key: 'path',
    width: 250,
    minWidth: 200,
    flex: 1,
  },
  protocol: {
    label: '协议',
    key: 'protocol',
    width: 80,
    minWidth: 80,
  },
  status: {
    label: '状态码',
    key: 'status',
    width: 80,
    minWidth: 80,
  },
  size: {
    label: '响应大小',
    key: 'size',
    width: 100,
    minWidth: 100,
  },
  referer: {
    label: '来源',
    key: 'referer',
    width: 200,
    minWidth: 150,
    flex: 1,
  },
  userAgent: {
    label: '用户代理',
    key: 'userAgent',
    width: 200,
    minWidth: 150,
    flex: 1,
  },
};

const DEFAULT_LOG_FORMATS = {
  nginx_default: {
    name: 'Nginx Default Log Format',
    pattern: /^\s*(\S+)\s*-\s*(\S+)\s*\[([^\]]+)\]\s*"([^"]+)"\s*(\d{3})\s*(\d+)(?:\s*"([^"]*)")?(?:\s*"([^"]*)")?(?:\s*"([^"]*)")?(?:\s*\(([^)]+)\))?(?:\s*@\s*\S+(?:\s*\S+)*)?\s*$/,
    description: 'Nginx默认日志格式（Combined Log Format）',
    fields: ['ip', 'time', 'method', 'path', 'protocol', 'status', 'size', 'referer', 'userAgent'],
  },
  combined_vhost: {
    name: 'Combined with Virtual Host',
    pattern: /^(\S+) \S+ \S+ \[([^\]]+)\] "([A-Z]+) ([^"]+) ([^"]+)" (\d{3}) (\d+) "([^"]*)" "([^"]*)"$/,
    description: '包含虚拟主机的组合日志格式',
    fields: ['ip', 'time', 'method', 'path', 'protocol', 'status', 'size', 'referer', 'userAgent'],
  },
  common: {
    name: 'Common Log Format',
    pattern: /^(\S+) \S+ \S+ \[([^\]]+)\] "([^"]+)" (\d{3}) (\d+)$/,
    description: 'Apache通用日志格式',
    fields: ['ip', 'time', 'method', 'path', 'protocol', 'status', 'size'],
  },
  json: {
    name: 'JSON Format',
    pattern: /^\{.*\}$/,
    description: 'JSON格式日志',
    fields: ['ip', 'time', 'method', 'path', 'protocol', 'status', 'size', 'referer', 'userAgent'],
  },
  custom_app: {
    name: 'Custom App Log Format',
    pattern: /^(\d{1,3}(?:\.\d{1,3}){3})\s+-\s+ruser:\[[^\]]*\]\s+-\s+\[([^\]]+)\]\s+-\s+request:\[([A-Z]+)\s+(\S+)\s+([^\]]+)\]\s+-\s+channel:\[[^\]]*\]\s+-\s+reqId:\[[^\]]*\]\s+-\s+routeName:\[[^\]]*\]\s+-\s+jsessionId:\[[^\]]*\]\s+-\s+logToken:\[[^\]]*\]\s+-\s+timestamp:\[[^\]]*\]\s+-\s+platId:\[[^\]]*\]\s+-\s+http_status:\[(\d{3})\]\s+-\s+body_bytes_sent:\[(\d+)\]\s+-\s+http_referer:\[(.*?)\]\s+-\s+http_user_agent:\[([^\]]*)\]/,
    description: '自定义应用日志格式',
    fields: ['ip', 'time', 'method', 'path', 'protocol', 'status', 'size', 'referer', 'userAgent'],
  },
};

const Logs = () => {
  const [activeTab, setActiveTab] = useState('access');
  const [selectedLogFile, setSelectedLogFile] = useState('access.log');
  const [logFiles, setLogFiles] = useState([]);
  const [accessLogs, setAccessLogs] = useState('');
  const [errorLogs, setErrorLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [lineCount, setLineCount] = useState(100);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [totalMatches, setTotalMatches] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, success: 0, error: 0, redirect: 0, warn: 0, info: 0 });
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [serversLoading, setServersLoading] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState({});
  const [selectedFormat, setSelectedFormat] = useState('nginx_default');
  const [customFormats, setCustomFormats] = useState([]);
  const [formatModalVisible, setFormatModalVisible] = useState(false);
  const [editingFormat, setEditingFormat] = useState(null);
  const [formatForm] = Form.useForm();
  const [selectedColumns, setSelectedColumns] = useState(['ip', 'time', 'method', 'path', 'protocol', 'status', 'size']);
  const [columnModalVisible, setColumnModalVisible] = useState(false);
  const [customColumns, setCustomColumns] = useState([]);
  const [addCustomColumnVisible, setAddCustomColumnVisible] = useState(false);
  const [customColumnForm] = Form.useForm();
  const [viewMode, setViewMode] = useState('columns');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    loadServers();
    loadCustomFormats();
    loadColumnSettings();
  }, []);

  useEffect(() => {
    const loadServerLogFiles = async () => {
      setSelectedLogFile('');
      setLoading(true);
      try {
        await loadLogFiles();
      } catch (error) {
        console.error('Failed to load log files:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadServerLogFiles();
  }, [selectedServer]);

  useEffect(() => {
    if (logFiles.length > 0) {
      if (activeTab === 'access') {
        const accessFiles = logFiles.filter(f => f.name.includes('access'));
        if (accessFiles.length > 0) {
          setSelectedLogFile(accessFiles[0].name);
        } else if (logFiles.length > 0) {
          setSelectedLogFile(logFiles[0].name);
        }
      } else if (activeTab === 'error') {
        const errorFiles = logFiles.filter(f => f.name.includes('error'));
        if (errorFiles.length > 0) {
          setSelectedLogFile(errorFiles[0].name);
        } else if (logFiles.length > 0) {
          setSelectedLogFile(logFiles[0].name);
        }
      }
    }
  }, [activeTab, logFiles]);

  useEffect(() => {
    loadLogs();
  }, [activeTab, selectedLogFile, lineCount, selectedFormat]);

  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        loadLogs();
      }, 5000);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh]);

  const loadServers = async () => {
    setServersLoading(true);
    try {
      const response = await serverAPI.getServers();
      const data = response.data?.data || response.data || [];
      const servers = Array.isArray(data) ? data : [];
      const filteredServers = servers.filter(server => !server.is_default);
      setServers(filteredServers);
    } catch (error) {
      console.error('Failed to load servers:', error);
    } finally {
      setServersLoading(false);
    }
  };

  const loadLogFiles = async () => {
    try {
      const response = await logAPI.getFiles(selectedServer);
      const data = response.data?.data || response.data || [];
      setLogFiles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load log files:', error);
      setLogFiles([]);
    }
  };

  const loadLogs = async () => {
    if (!selectedLogFile) {
      return;
    }
    
    setCurrentPage(1);
    setLoading(true);
    try {
      if (activeTab === 'access') {
        const response = await logAPI.getAccessLog({
          file: selectedLogFile,
          lines: lineCount,
          keyword: searchKeyword,
          serverId: selectedServer,
        });
        const data = response.data?.data || response.data || {};
        setAccessLogs(data.logs || '');
        setTotalMatches(data.total || 0);
        setFilteredTotal(data.filteredTotal || 0);
        setStats(data.stats || { total: 0, success: 0, error: 0, redirect: 0 });
      } else if (activeTab === 'error') {
        const response = await logAPI.getErrorLog({
          file: selectedLogFile,
          lines: lineCount,
          keyword: searchKeyword,
          serverId: selectedServer,
        });
        const data = response.data?.data || response.data || {};
        setErrorLogs(data.logs || '');
        setTotalMatches(data.total || 0);
        setFilteredTotal(data.filteredTotal || 0);
        setStats(data.stats || { total: 0, warn: 0, info: 0 });
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
      if (activeTab === 'error') {
        setErrorLogs('');
        message.error('加载错误日志失败: ' + (error.response?.data?.message || error.message));
      } else {
        setAccessLogs('');
        message.error('加载访问日志失败: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCustomFormats = () => {
    const savedFormats = localStorage.getItem('customLogFormats');
    if (savedFormats) {
      try {
        const formats = JSON.parse(savedFormats);
        Object.keys(formats).forEach(key => {
          if (formats[key].pattern) {
            formats[key].pattern = new RegExp(formats[key].pattern.source);
          }
        });
        setCustomFormats(formats);
      } catch (error) {
        console.error('Failed to load custom formats:', error);
      }
    }
  };

  const saveCustomFormats = (formats) => {
    const formatsToSave = { ...formats };
    Object.keys(formatsToSave).forEach(key => {
      if (formatsToSave[key].pattern) {
        formatsToSave[key] = {
          ...formatsToSave[key],
          pattern: {
            source: formatsToSave[key].pattern.source,
          },
        };
      }
    });
    localStorage.setItem('customLogFormats', JSON.stringify(formatsToSave));
    setCustomFormats(formats);
  };

  const handleAddFormat = () => {
    setEditingFormat(null);
    formatForm.resetFields();
    setFormatModalVisible(true);
  };

  const handleEditFormat = (formatKey) => {
    const format = customFormats[formatKey];
    if (format) {
      setEditingFormat(formatKey);
      formatForm.setFieldsValue({
        name: format.name,
        pattern: format.pattern.source,
        description: format.description,
        fields: format.fields,
      });
      setFormatModalVisible(true);
    }
  };

  const handleDeleteFormat = (formatKey) => {
    const newFormats = { ...customFormats };
    delete newFormats[formatKey];
    saveCustomFormats(newFormats);
    message.success('删除格式模板成功');
    if (selectedFormat === formatKey) {
      setSelectedFormat('nginx_default');
    }
  };

  const getLogFormats = () => {
    return { ...DEFAULT_LOG_FORMATS, ...customFormats };
  };

  const getAvailableColumns = () => {
    const formats = getLogFormats();
    const format = formats[selectedFormat];
    if (!format || !format.fields) {
      return [...Object.keys(COLUMN_DEFINITIONS), ...customColumns.map(c => c.key)];
    }
    return [...format.fields, ...customColumns.map(c => c.key)];
  };

  const handleOpenColumnModal = () => {
    setColumnModalVisible(true);
  };

  const handleColumnSave = (columns) => {
    setSelectedColumns(columns);
    setColumnModalVisible(false);
    localStorage.setItem('logColumns', JSON.stringify(columns));
  };

  const loadColumnSettings = () => {
    const savedColumns = localStorage.getItem('logColumns');
    if (savedColumns) {
      try {
        setSelectedColumns(JSON.parse(savedColumns));
      } catch (error) {
        console.error('Failed to load column settings:', error);
      }
    }
    
    const savedCustomColumns = localStorage.getItem('customLogColumns');
    if (savedCustomColumns) {
      try {
        setCustomColumns(JSON.parse(savedCustomColumns));
      } catch (error) {
        console.error('Failed to load custom columns:', error);
      }
    }
  };

  const handleAddCustomColumn = () => {
    setAddCustomColumnVisible(true);
    customColumnForm.resetFields();
  };

  const handleCustomColumnSubmit = () => {
    customColumnForm.validateFields().then(values => {
      const columnKey = values.key.toLowerCase().replace(/\s+/g, '_');
      
      if (COLUMN_DEFINITIONS[columnKey] || customColumns.find(c => c.key === columnKey)) {
        message.error('列键已存在');
        return;
      }
      
      const newColumn = {
        key: columnKey,
        label: values.label,
        width: values.width || 150,
        minWidth: values.minWidth || 100,
        flex: values.flex ? 1 : 0,
        extractPattern: values.extractPattern,
      };
      
      const newColumns = [...customColumns, newColumn];
      setCustomColumns(newColumns);
      localStorage.setItem('customLogColumns', JSON.stringify(newColumns));
      
      setAddCustomColumnVisible(false);
      customColumnForm.resetFields();
      message.success('添加自定义列成功');
    });
  };

  const handleDeleteCustomColumn = (columnKey) => {
    const newColumns = customColumns.filter(c => c.key !== columnKey);
    setCustomColumns(newColumns);
    localStorage.setItem('customLogColumns', JSON.stringify(newColumns));
    setSelectedColumns(prev => prev.filter(c => c !== columnKey));
    message.success('删除自定义列成功');
  };

  const handleFormatSubmit = () => {
    formatForm.validateFields().then(values => {
      const formatKey = values.name.toLowerCase().replace(/\s+/g, '_');
      
      try {
        const pattern = new RegExp(values.pattern);
        const newFormat = {
          name: values.name,
          pattern: pattern,
          description: values.description,
          fields: values.fields || ['ip', 'time', 'method', 'path', 'protocol', 'status', 'size'],
        };
        
        const newFormats = { ...customFormats };
        newFormats[formatKey] = newFormat;
        saveCustomFormats(newFormats);
        
        setSelectedFormat(formatKey);
        setFormatModalVisible(false);
        formatForm.resetFields();
        message.success('保存格式模板成功');
      } catch (error) {
        message.error('正则表达式格式错误，请检查');
      }
    });
  };

  const handleRefresh = () => {
    setCurrentPage(1);
    loadLogs();
  };

  const handleLineCountChange = (value) => {
    setLineCount(value);
    setCurrentPage(1);
  };

  const handleLogFileChange = (value) => {
    setSelectedLogFile(value);
    setCurrentPage(1);
  };

  const handleSearch = (value) => {
    setSearchKeyword(value);
  };

  const handleClearSearch = () => {
    setSearchKeyword('');
    setCurrentPage(1);
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const parseAccessLog = (logLine) => {
    const formats = getLogFormats();
    const format = formats[selectedFormat];
    
    if (!format) {
      console.warn('Format not found for:', selectedFormat, 'Available formats:', Object.keys(formats));
      return {
        ip: '-',
        time: '-',
        method: '-',
        path: '-',
        protocol: '-',
        status: '-',
        size: 0,
        referer: '-',
        userAgent: '-',
      };
    }

    const match = logLine.match(format.pattern);
    
    if (!match) {
      console.warn('Log line does not match format pattern:', logLine, 'Format:', selectedFormat, 'Pattern:', format.pattern);
      return {
        ip: '-',
        time: '-',
        method: '-',
        path: '-',
        protocol: '-',
        status: '-',
        size: 0,
        referer: '-',
        userAgent: '-',
      };
    }

    let ip = '-';
    let time = '-';
    let method = '-';
    let path = '-';
    let protocol = '-';
    let status = '-';
    let size = 0;
    let referer = '-';
    let userAgent = '-';

    if (selectedFormat === 'nginx_default' || selectedFormat === 'combined_vhost') {
      ip = match[1];
      time = match[3];
      const request = match[4] || '';
      const requestMatch = request.match(/^([A-Z]+) (\S+) ([^"]+)$/);
      if (requestMatch) {
        method = requestMatch[1];
        path = requestMatch[2];
        protocol = requestMatch[3];
      } else {
        method = request;
        path = '-';
        protocol = '-';
      }
      status = parseInt(match[5]);
      size = parseInt(match[6]);
      
      referer = match[7] || '-';
      userAgent = match[8] || '-';
      
      const extraField = match[9];
      if (extraField) {
        if (userAgent === '-' && extraField !== '-') {
          userAgent = extraField;
        }
      }
    } else if (selectedFormat === 'common') {
      ip = match[1];
      time = match[2];
      const request = match[3] || '';
      const requestMatch = request.match(/^([A-Z]+) (\S+) ([^"]+)$/);
      if (requestMatch) {
        method = requestMatch[1];
        path = requestMatch[2];
        protocol = requestMatch[3];
      } else {
        method = request;
        path = '-';
        protocol = '-';
      }
      status = parseInt(match[4]);
      size = parseInt(match[5]);
    } else if (selectedFormat === 'json') {
      try {
        const jsonData = JSON.parse(logLine);
        ip = jsonData.ip || jsonData.remote_addr || '-';
        time = jsonData.time || jsonData.time_local || '-';
        method = jsonData.method || jsonData.request_method || '-';
        path = jsonData.uri || jsonData.request_uri || '-';
        protocol = jsonData.protocol || jsonData.server_protocol || '-';
        status = jsonData.status || jsonData.request_status || '-';
        size = jsonData.body_bytes_sent || jsonData.bytes_sent || 0;
        referer = jsonData.http_referer || jsonData.referer || '-';
        userAgent = jsonData.http_user_agent || jsonData.user_agent || '-';
      } catch (e) {
        console.error('Failed to parse JSON log:', e);
      }
    } else if (selectedFormat === 'custom_app') {
      ip = match[1];
      time = match[2];
      method = match[3];
      path = match[4];
      protocol = match[5];
      status = parseInt(match[6]);
      size = parseInt(match[7]);
      referer = match[8] || '-';
      userAgent = match[9] || '-';
    } else {
      const fields = format.fields || [];
      fields.forEach((field, index) => {
        if (match[index + 1]) {
          const value = match[index + 1];
          switch (field) {
            case 'ip':
              ip = value;
              break;
            case 'time':
              time = value;
              break;
            case 'method':
              method = value;
              break;
            case 'path':
              path = value;
              break;
            case 'protocol':
              protocol = value;
              break;
            case 'status':
              status = parseInt(value) || '-';
              break;
            case 'size':
              size = parseInt(value) || 0;
              break;
            case 'referer':
              referer = value;
              break;
            case 'userAgent':
              userAgent = value;
              break;
          }
        }
      });
    }

    const result = {
      ip,
      time,
      method,
      path,
      protocol,
      status,
      size,
      referer,
      userAgent,
    };

    customColumns.forEach(column => {
      if (column.extractPattern) {
        try {
          const extractRegex = new RegExp(column.extractPattern);
          const extractMatch = logLine.match(extractRegex);
          if (extractMatch && extractMatch[1]) {
            result[column.key] = extractMatch[1];
          }
        } catch (error) {
          console.error('Failed to extract custom field:', column.key, error);
        }
      }
    });

    return result;
  };

  const renderAccessLogs = () => {
    if (!accessLogs) {
      return <Empty description="暂无访问日志" />;
    }

    const lines = accessLogs.split('\n').filter(line => line.trim()).reverse();
    const availableColumns = getAvailableColumns();
    
    if (lines.length === 0) {
      return <Empty description="暂无访问日志" />;
    }
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const displayLines = lines.slice(startIndex, endIndex);
    const totalPages = Math.ceil(lines.length / pageSize);
    
    if (viewMode === 'raw') {
      return (
        <>
          {displayLines.map((line, index) => {
            const actualIndex = startIndex + index;
            const isExpanded = expandedLogs[`access-${actualIndex}`];
            const isLongLine = line.length > 300;

            return (
              <div key={actualIndex} className="log-entry" style={{
                padding: '12px 16px',
                borderBottom: '1px solid #F1F5F9',
                fontFamily: 'monospace',
                fontSize: 13,
                transition: 'all 0.2s ease',
              }}>
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
                    {line}
                  </span>
                  {isLongLine && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setExpandedLogs(prev => ({ ...prev, [`access-${actualIndex}`]: !isExpanded }))}
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
          {lines.length > pageSize && (
            <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid #F1F5F9' }}>
              <Pagination
                current={currentPage}
                total={lines.length}
                pageSize={pageSize}
                onChange={(page, size) => {
                  setCurrentPage(page);
                  setPageSize(size);
                }}
                showSizeChanger
                showTotal={(total) => `共 ${total} 条`}
                pageSizeOptions={['10', '20', '50', '100', '200']}
              />
            </div>
          )}
        </>
      );
    }
    
    return (
      <>
        {displayLines.map((line, index) => {
          const actualIndex = startIndex + index;
          const parsed = parseAccessLog(line);
          const statusColor = parsed.status >= 500 ? 'error' : parsed.status >= 400 ? 'warning' : 'success';
          const isExpanded = expandedLogs[`access-${actualIndex}`];
          const isLongLine = line.length > 300;

      const renderColumn = (columnKey) => {
        const columnDef = COLUMN_DEFINITIONS[columnKey] || customColumns.find(c => c.key === columnKey);
        const value = parsed[columnKey];
        
        if (!columnDef) {
          console.warn('Column definition not found for:', columnKey, 'Available:', Object.keys(COLUMN_DEFINITIONS), 'Custom:', customColumns.map(c => c.key));
          return null;
        }

        const isCustomColumn = customColumns.find(c => c.key === columnKey);

        switch (columnKey) {
          case 'ip':
            return (
              <Tooltip title={value}>
                <span style={{ color: '#64748B', minWidth: columnDef.minWidth, fontWeight: 500, flexShrink: 0 }}>{value}</span>
              </Tooltip>
            );
          case 'time':
            return (
              <Tooltip title={value}>
                <span style={{ color: '#94A3B8', minWidth: columnDef.minWidth, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <ClockCircleOutlined style={{ fontSize: 12 }} />
                  {value}
                </span>
              </Tooltip>
            );
          case 'method':
            return (
              <Tag color="blue" style={{ minWidth: columnDef.minWidth, textAlign: 'center', fontWeight: 500, flexShrink: 0 }}>{value}</Tag>
            );
          case 'path':
            return (
              <Tooltip title={value}>
                <span style={{ color: '#1E293B', minWidth: columnDef.minWidth, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, flexShrink: columnDef.flex ? 1 : 0 }}>
                  {value}
                </span>
              </Tooltip>
            );
          case 'protocol':
            return (
              <span style={{ color: '#64748B', minWidth: columnDef.minWidth, flexShrink: 0 }}>{value}</span>
            );
          case 'status':
            return (
              <Badge status={statusColor} text={value} style={{ minWidth: columnDef.minWidth, flexShrink: 0 }} />
            );
          case 'size':
            return (
              <span style={{ color: '#64748B', fontSize: 12, minWidth: columnDef.minWidth, flexShrink: 0 }}>{(value / 1024).toFixed(2)} KB</span>
            );
          case 'referer':
            return (
              <Tooltip title={value}>
                <span style={{ color: '#64748B', minWidth: columnDef.minWidth, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: columnDef.flex ? 1 : 0 }}>
                  {value}
                </span>
              </Tooltip>
            );
          case 'userAgent':
            return (
              <Tooltip title={value}>
                <span style={{ color: '#64748B', minWidth: columnDef.minWidth, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: columnDef.flex ? 1 : 0 }}>
                  {value}
                </span>
              </Tooltip>
            );
          default:
            if (isCustomColumn) {
              return (
                <Tooltip title={value}>
                  <span style={{ color: '#64748B', minWidth: columnDef.minWidth, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: columnDef.flex ? 1 : 0 }}>
                    {value || '-'}
                  </span>
                </Tooltip>
              );
            }
            console.warn('Unknown column key:', columnKey);
            return null;
        }
      };

      return (
        <div key={actualIndex} className="log-entry" style={{
          padding: '12px 16px',
          borderBottom: '1px solid #F1F5F9',
          fontFamily: 'monospace',
          fontSize: 13,
          transition: 'all 0.2s ease',
        }}>
          <div style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'nowrap',
            overflow: 'hidden',
          }}>
            {selectedColumns.map(columnKey => renderColumn(columnKey))}
            {isLongLine && (
              <Button
                type="link"
                size="small"
                onClick={() => setExpandedLogs(prev => ({ ...prev, [`access-${actualIndex}`]: !isExpanded }))}
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
    {lines.length > pageSize && (
      <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid #F1F5F9' }}>
        <Pagination
          current={currentPage}
          total={lines.length}
          pageSize={pageSize}
          onChange={(page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          }}
          showSizeChanger
          showTotal={(total) => `共 ${total} 条`}
          pageSizeOptions={['10', '20', '50', '100', '200']}
        />
      </div>
    )}
  </>
  );
  };

  const renderErrorLogs = () => {
    if (!errorLogs) {
      return <Empty description="暂无错误日志" />;
    }

    const lines = errorLogs.split('\n').filter(line => line.trim()).reverse();
    
    if (lines.length === 0) {
      return <Empty description="暂无错误日志" />;
    }
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const displayLines = lines.slice(startIndex, endIndex);
    
    return (
      <>
        {displayLines.map((line, index) => {
          const actualIndex = startIndex + index;
          const timeMatch = line.match(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}/);
          const levelMatch = line.match(/\[(error|warn|info|debug)\]/i);

          let levelColor = 'default';
          let levelIcon = <InfoOutlined />;
          if (levelMatch) {
            const level = levelMatch[1].toLowerCase();
            if (level === 'error') {
              levelColor = 'error';
              levelIcon = <CloseCircleOutlined />;
            } else if (level === 'warn') {
              levelColor = 'warning';
              levelIcon = <WarningOutlined />;
            } else if (level === 'info') {
              levelColor = 'processing';
              levelIcon = <InfoOutlined />;
            }
          }

          const isExpanded = expandedLogs[`error-${actualIndex}`];
          const isLongLine = line.length > 300;

          return (
            <div key={actualIndex} className="log-entry" style={{
              padding: '12px 16px',
              borderBottom: '1px solid #F1F5F9',
              fontFamily: 'monospace',
              fontSize: 13,
              transition: 'all 0.2s ease',
            }}>
              <div style={{
                display: 'flex',
                gap: 16,
                alignItems: 'center',
                flexWrap: 'nowrap',
                overflow: 'hidden',
              }}>
                <span style={{ color: '#94A3B8', minWidth: 160, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <ClockCircleOutlined style={{ fontSize: 12 }} />
                  {timeMatch ? timeMatch[0] : '-'}
                </span>
                {levelMatch && (
                  <Badge 
                    status={levelColor} 
                    text={levelMatch[1].toUpperCase()}
                    style={{ minWidth: 80, flexShrink: 0 }}
                  />
                )}
                <span style={{ color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, flexShrink: 1 }}>
                  {line}
                </span>
                {isLongLine && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setExpandedLogs(prev => ({ ...prev, [`error-${actualIndex}`]: !isExpanded }))}
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
        {lines.length > pageSize && (
          <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid #F1F5F9' }}>
            <Pagination
              current={currentPage}
              total={lines.length}
              pageSize={pageSize}
              onChange={(page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              }}
              showSizeChanger
              showTotal={(total) => `共 ${total} 条`}
              pageSizeOptions={['10', '20', '50', '100', '200']}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div style={{ padding: 24, backgroundColor: '#F1F5F9', minHeight: '100vh' }}>
      <Card className="stats-card" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Card className="stat-card">
              <Statistic
                title="总请求数"
                value={totalMatches}
                prefix={<FileTextOutlined style={{ color: '#3B82F6' }} />}
                valueStyle={{ color: '#3B82F6', fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="stat-card">
              <Statistic
                title="成功"
                value={stats.success || 0}
                prefix={<CheckCircleOutlined style={{ color: '#10B981' }} />}
                valueStyle={{ color: '#10B981', fontWeight: 600 }}
              />
            </Card>
          </Col>
          {activeTab === 'access' ? (
            <>
              <Col xs={24} sm={12} md={6}>
                <Card className="stat-card">
                  <Statistic
                    title="错误"
                    value={stats.error || 0}
                    prefix={<CloseCircleOutlined style={{ color: '#EF4444' }} />}
                    valueStyle={{ color: '#EF4444', fontWeight: 600 }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="stat-card">
                  <Statistic
                    title="重定向"
                    value={stats.redirect || 0}
                    prefix={<ReloadOutlined style={{ color: '#F59E0B' }} />}
                    valueStyle={{ color: '#F59E0B', fontWeight: 600 }}
                  />
                </Card>
              </Col>
            </>
          ) : (
            <>
              <Col xs={24} sm={12} md={6}>
                <Card className="stat-card">
                  <Statistic
                    title="错误"
                    value={stats.error || 0}
                    prefix={<CloseCircleOutlined style={{ color: '#EF4444' }} />}
                    valueStyle={{ color: '#EF4444', fontWeight: 600 }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="stat-card">
                  <Statistic
                    title="警告"
                    value={stats.warn || 0}
                    prefix={<WarningOutlined style={{ color: '#F59E0B' }} />}
                    valueStyle={{ color: '#F59E0B', fontWeight: 600 }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="stat-card">
                  <Statistic
                    title="信息"
                    value={stats.info || 0}
                    prefix={<InfoOutlined style={{ color: '#3B82F6' }} />}
                    valueStyle={{ color: '#3B82F6', fontWeight: 600 }}
                  />
                </Card>
              </Col>
            </>
          )}
        </Row>
      </Card>

      {searchKeyword && (
        <Alert
          message={`搜索 "${searchKeyword}" 匹配到 ${totalMatches} 条记录`}
          type="info"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          onClose={handleClearSearch}
        />
      )}

      <Card
        title={
          <Space>
            <span>日志查看</span>
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {getLogFormats()[selectedFormat]?.name || '未知格式'}
            </Tag>
          </Space>
        }
        extra={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CloudServerOutlined style={{ color: '#64748B', fontSize: 14 }} />
                <Select
                  style={{ width: 180 }}
                  value={selectedServer}
                  onChange={setSelectedServer}
                  placeholder="选择服务器"
                  loading={serversLoading}
                >
                  <Option key="local" value={null}>本地服务器</Option>
                  {servers.map(server => (
                    <Option key={server.id} value={server.id}>{server.name}</Option>
                  ))}
                </Select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FolderOutlined style={{ color: '#64748B', fontSize: 14 }} />
                <Select
                  style={{ width: 200 }}
                  value={selectedLogFile}
                  onChange={handleLogFileChange}
                  placeholder="选择日志文件"
                >
                  {logFiles
                    .filter(f => activeTab === 'access' ? f.name.includes('access') : f.name.includes('error'))
                    .map(file => (
                      <Option key={file.name} value={file.name}>{file.name}</Option>
                    ))}
                </Select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileTextOutlined style={{ color: '#64748B', fontSize: 14 }} />
                <Select
                  style={{ width: 200 }}
                  value={selectedFormat}
                  onChange={setSelectedFormat}
                  placeholder="选择日志格式"
                >
                  {Object.entries(getLogFormats()).map(([key, format]) => (
                    <Option key={key} value={key}>{format.name}</Option>
                  ))}
                </Select>
              </div>

              <Button
                type="default"
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAddFormat}
              >
                自定义格式
              </Button>

              {viewMode === 'columns' && (
                <Button
                  type="default"
                  size="small"
                  icon={<BgColorsOutlined />}
                  onClick={handleOpenColumnModal}
                >
                  列设置
                </Button>
              )}

              <Radio.Group
                value={viewMode}
                onChange={(e) => {
                  setViewMode(e.target.value);
                  setCurrentPage(1);
                }}
                size="small"
                buttonStyle="solid"
              >
                <Radio.Button value="columns">列视图</Radio.Button>
                <Radio.Button value="raw">原始视图</Radio.Button>
              </Radio.Group>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Input
                placeholder="搜索IP或路径 (空格分隔多个关键字)"
                prefix={<SearchOutlined />}
                value={searchKeyword}
                onChange={(e) => handleSearch(e.target.value)}
                onPressEnter={() => loadLogs()}
                style={{ width: 350 }}
                allowClear
                onClear={handleClearSearch}
              />
              <Tooltip title="搜索">
                <Button
                  icon={<SearchOutlined />}
                  onClick={loadLogs}
                  loading={loading}
                >
                  搜索
                </Button>
              </Tooltip>

              <span style={{ color: '#64748B', fontWeight: 500 }}>显示行数:</span>
              <InputNumber
                min={10}
                max={1000}
                step={10}
                value={lineCount}
                onChange={handleLineCountChange}
                style={{ width: 100 }}
              />

              <Button
                type={autoRefresh ? 'primary' : 'default'}
                onClick={toggleAutoRefresh}
                icon={<ReloadOutlined />}
              >
                {autoRefresh ? '停止自动刷新' : '自动刷新'}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              >
                刷新
              </Button>
            </div>
          </div>
        }
      >
        <Tabs activeKey={activeTab} onChange={(key) => {
          setActiveTab(key);
          setCurrentPage(1);
        }}>
          <Tabs.TabPane tab="访问日志" key="access">
            <Spin spinning={loading}>
              {renderAccessLogs()}
            </Spin>
          </Tabs.TabPane>
          <Tabs.TabPane tab="错误日志" key="error">
            <Spin spinning={loading}>
              {renderErrorLogs()}
            </Spin>
          </Tabs.TabPane>
        </Tabs>
      </Card>

      <Modal
        title={editingFormat ? '编辑自定义格式' : '添加自定义格式'}
        open={formatModalVisible}
        onOk={handleFormatSubmit}
        onCancel={() => setFormatModalVisible(false)}
        width={600}
        destroyOnClose
      >
        <Form
          form={formatForm}
          layout="vertical"
          initialValues={{
            fields: ['ip', 'time', 'method', 'path', 'protocol', 'status', 'size'],
          }}
        >
          <Form.Item
            label="格式名称"
            name="name"
            rules={[{ required: true, message: '请输入格式名称' }]}
          >
            <Input placeholder="例如: Custom Format" />
          </Form.Item>
          <Form.Item
            label="正则表达式"
            name="pattern"
            rules={[{ required: true, message: '请输入正则表达式' }]}
            extra="使用捕获组来提取日志字段"
          >
            <TextArea rows={4} placeholder="输入正则表达式..." />
          </Form.Item>
          <Form.Item
            label="字段映射"
            name="fields"
            rules={[{ required: true, message: '请选择字段映射' }]}
            extra="按顺序对应正则表达式的捕获组"
          >
            <Select
              mode="multiple"
              placeholder="选择字段"
              options={[
                { label: 'IP地址', value: 'ip' },
                { label: '时间', value: 'time' },
                { label: '请求方法', value: 'method' },
                { label: '请求路径', value: 'path' },
                { label: '协议', value: 'protocol' },
                { label: '状态码', value: 'status' },
                { label: '响应大小', value: 'size' },
                { label: '来源', value: 'referer' },
                { label: '用户代理', value: 'userAgent' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="描述"
            name="description"
          >
            <TextArea rows={2} placeholder="格式描述..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="列设置"
        open={columnModalVisible}
        onOk={() => handleColumnSave(selectedColumns)}
        onCancel={() => setColumnModalVisible(false)}
        width={600}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <span style={{ color: '#64748B', fontSize: 12 }}>
            可用列（基于当前日志格式）：
          </span>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Button
            size="small"
            onClick={() => setSelectedColumns(getAvailableColumns())}
            style={{ marginRight: 8 }}
          >
            全选
          </Button>
          <Button
            size="small"
            onClick={() => setSelectedColumns([])}
          >
            清空
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAddCustomColumn}
            style={{ marginLeft: 8 }}
          >
            添加自定义列
          </Button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 14 }}>默认列：</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.keys(COLUMN_DEFINITIONS).map(columnKey => {
              const columnDef = COLUMN_DEFINITIONS[columnKey];
              if (!columnDef) return null;
              const isSelected = selectedColumns.includes(columnKey);
              return (
                <Tag
                  key={columnKey}
                  color={isSelected ? 'blue' : 'default'}
                  style={{
                    cursor: 'pointer',
                    padding: '4px 12px',
                    fontSize: 13,
                  }}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedColumns(prev => prev.filter(c => c !== columnKey));
                    } else {
                      setSelectedColumns(prev => [...prev, columnKey]);
                    }
                  }}
                >
                  {isSelected ? '✓ ' : ''}{columnDef.label}
                </Tag>
              );
            })}
          </div>
        </div>
        {customColumns.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 14 }}>自定义列：</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {customColumns.map(column => {
                const isSelected = selectedColumns.includes(column.key);
                return (
                  <Tag
                    key={column.key}
                    color={isSelected ? 'blue' : 'default'}
                    closable
                    onClose={() => handleDeleteCustomColumn(column.key)}
                    style={{
                      cursor: 'pointer',
                      padding: '4px 12px',
                      fontSize: 13,
                    }}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedColumns(prev => prev.filter(c => c !== column.key));
                      } else {
                        setSelectedColumns(prev => [...prev, column.key]);
                      }
                    }}
                  >
                    {isSelected ? '✓ ' : ''}{column.label}
                  </Tag>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#F8FAFC', borderRadius: 4, fontSize: 12, color: '#64748B' }}>
          <div>当前显示顺序：</div>
          <div style={{ marginTop: 8 }}>
            {selectedColumns.map((columnKey, index) => {
              const columnDef = COLUMN_DEFINITIONS[columnKey] || customColumns.find(c => c.key === columnKey);
              if (!columnDef) return null;
              return (
                <Tag
                    key={columnKey}
                    closable
                    onClose={() => setSelectedColumns(prev => prev.filter(c => c !== columnKey))}
                    style={{
                      marginBottom: 8,
                      fontSize: 13,
                    }}
                  >
                    {columnDef.label}
                  </Tag>
              );
            })}
          </div>
        </div>
      </Modal>

      <Modal
        title="添加自定义列"
        open={addCustomColumnVisible}
        onOk={handleCustomColumnSubmit}
        onCancel={() => setAddCustomColumnVisible(false)}
        width={500}
        destroyOnClose
      >
        <Form
          form={customColumnForm}
          layout="vertical"
        >
          <Form.Item
            label="列键"
            name="key"
            rules={[{ required: true, message: '请输入列键' }]}
            extra="用于唯一标识此列，建议使用英文小写字母和下划线"
          >
            <Input placeholder="例如: channel" />
          </Form.Item>
          <Form.Item
            label="列名称"
            name="label"
            rules={[{ required: true, message: '请输入列名称' }]}
          >
            <Input placeholder="例如: 渠道" />
          </Form.Item>
          <Form.Item
            label="提取正则"
            name="extractPattern"
            rules={[{ required: true, message: '请输入提取正则' }]}
            extra="使用捕获组提取字段值，例如: channel:\[([^\]]*)\]"
          >
            <Input placeholder="例如: channel:\[([^\]]*)\]" />
          </Form.Item>
          <Form.Item
            label="列宽"
            name="width"
            extra="留空使用默认值"
          >
            <InputNumber
              placeholder="例如: 150"
              min={50}
              max={500}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            label="最小宽度"
            name="minWidth"
            extra="留空使用默认值"
          >
            <InputNumber
              placeholder="例如: 100"
              min={50}
              max={300}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            label="弹性布局"
            name="flex"
            valuePropName="checked"
            extra="勾选后列会自动扩展填充剩余空间"
          >
            <Radio.Group>
              <Radio value={true}>是</Radio>
              <Radio value={false}>否</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      {Object.keys(customFormats).length > 0 && (
        <Card
          title="自定义格式管理"
          style={{ marginTop: 24 }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {Object.entries(customFormats).map(([key, format]) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 8,
                  border: selectedFormat === key ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>
                    {format.name}
                    {selectedFormat === key && (
                      <Tag color="blue" style={{ marginLeft: 8 }}>当前使用</Tag>
                    )}
                  </div>
                  <div style={{ color: '#64748B', fontSize: 12 }}>
                    {format.description}
                  </div>
                </div>
                <Space>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEditFormat(key)}
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确定删除此格式吗？"
                    onConfirm={() => handleDeleteFormat(key)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                    >
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
            ))}
          </Space>
        </Card>
      )}
    </div>
  );
};

export default Logs;