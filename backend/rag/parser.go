package rag

import (
    "archive/zip"
    "bytes"
    "encoding/xml"
    "fmt"
    "io"
    "path/filepath"
    "strings"
)

func ExtractText(filename string, r io.Reader) (string, error) {
    ext := strings.ToLower(filepath.Ext(filename))
    switch ext {
    case ".txt", ".md":
        data, err := io.ReadAll(r)
        if err != nil {
            return "", err
        }
        return strings.TrimSpace(string(data)), nil
    case ".docx":
        return extractDOCXText(r)
    case ".pdf":
        return "", fmt.Errorf("暂不支持 PDF 自动解析，请优先上传 txt、md 或 docx 文档")
    default:
        return "", fmt.Errorf("暂不支持的文档格式: %s", ext)
    }
}

func extractDOCXText(r io.Reader) (string, error) {
    data, err := io.ReadAll(r)
    if err != nil {
        return "", err
    }

    zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
    if err != nil {
        return "", fmt.Errorf("读取 docx 压缩结构失败: %w", err)
    }

    for _, file := range zr.File {
        if file.Name != "word/document.xml" {
            continue
        }

        rc, err := file.Open()
        if err != nil {
            return "", err
        }
        defer rc.Close()

        text, err := extractWordDocumentXML(rc)
        if err != nil {
            return "", err
        }
        return strings.TrimSpace(text), nil
    }

    return "", fmt.Errorf("docx 中未找到正文内容")
}

func extractWordDocumentXML(r io.Reader) (string, error) {
    decoder := xml.NewDecoder(r)
    var builder strings.Builder
    var current strings.Builder

    flushParagraph := func() {
        text := strings.TrimSpace(current.String())
        if text == "" {
            current.Reset()
            return
        }
        if builder.Len() > 0 {
            builder.WriteString("\n")
        }
        builder.WriteString(text)
        current.Reset()
    }

    for {
        token, err := decoder.Token()
        if err == io.EOF {
            flushParagraph()
            break
        }
        if err != nil {
            return "", fmt.Errorf("解析 docx XML 失败: %w", err)
        }

        switch elem := token.(type) {
        case xml.StartElement:
            switch elem.Name.Local {
            case "t":
                var content string
                if err := decoder.DecodeElement(&content, &elem); err != nil {
                    return "", err
                }
                current.WriteString(content)
            case "tab":
                current.WriteString("\t")
            case "br":
                current.WriteString("\n")
            }
        case xml.EndElement:
            if elem.Name.Local == "p" {
                flushParagraph()
            }
        }
    }

    return builder.String(), nil
}
