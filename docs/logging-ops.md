# 日志治理（防磁盘写满）

## 要解决的问题

`tfhers-web-management` 原本有 `mybatis.configuration.log-impl: StdOutImpl`，它把**每一条执行的 SQL**
直接打到 stdout。服务由 systemd 管理，stdout 全部进 journal，而 journal 默认上限是所在分区的 10%
（40G 盘 → 可涨到 4G），且没有任何保留策略。

后果是渐进的：日志慢慢吃满系统盘 → MySQL 无法写 binlog/临时文件 → 写入失败 → **全站 500**。
这不是"日志太多"的小毛病，是会导致宕机的隐患。

## 改动（已在仓库，随下一次部署生效）

| 文件 | 改动 |
|---|---|
| `tfhers-web-management/src/main/resources/application.yml` | `log-impl` 由 `StdOutImpl` 改为 `Slf4jImpl`；新增 `logging` 段（root/com.example 均为 INFO，`com.example.mapper` 为 INFO） |
| `tfhers-web-app/src/main/resources/application.yml` | 同步改为 `Slf4jImpl`（该模块生产未部署，保持一致） |
| `deploy/systemd/journald-size.conf` | 新增 journal 硬上限配置（500M / 单文件 50M / 保留 30 天） |

要点：**SQL 日志在 MyBatis 里是 DEBUG 级**，mapper 命名空间的 logger 设为 INFO 后就不再输出。
所以不需要"关掉日志"，只把默认级别设对即可，排查问题时仍可临时打开。

## 部署

正常走 `push main` → Actions → 重启 jar 即可，无需手工操作。

## 服务器侧一次性配置（journald 上限）

```bash
mkdir -p /etc/systemd/journald.conf.d
cp /opt/tfhers/deploy/systemd/journald-size.conf /etc/systemd/journald.conf.d/tfhers-size.conf
# 如果这个文件还没同步到服务器，也可以直接在服务器上创建：
#   cat > /etc/systemd/journald.conf.d/tfhers-size.conf <<'EOF'
#   [Journal]
#   SystemMaxUse=500M
#   SystemMaxFileSize=50M
#   MaxRetentionSec=30day
#   EOF

systemctl restart systemd-journald
journalctl --disk-usage
```

`restart systemd-journald` **不会重启业务服务**，安全。上限改小后旧日志会被自动清理。

## 怎么验证确实生效

部署前后各跑一次，对比数字：

```bash
# journal 当前占用的磁盘
journalctl --disk-usage

# 今天这个服务产生了多少行日志
journalctl -u tfhers-management --since today | wc -l

# 日志里还有没有逐条 SQL（改造前会有大量 "==>  Preparing:" / "==> Parameters:"）
journalctl -u tfhers-management --since "10 min ago" | grep -c 'Preparing:'
```

期望：`grep -c 'Preparing:'` 的结果是 **0**，且 `journalctl -u tfhers-management --since today | wc -l`
显著下降（正常访问下一天应该只有几十到几百行启动/异常记录）。

## 需要临时看 SQL 时（不要改配置文件）

```bash
# 临时把 mapper 调到 DEBUG（重启生效，排查完记得去掉）
systemctl edit --full tfhers-management   # 在 ExecStart 行尾加参数
# 或在启动命令上加：--logging.level.com.example.mapper=DEBUG
```

也可以用环境变量临时覆盖（不需要改 jar）：

```bash
LOGGING_LEVEL_COM_EXAMPLE_MAPPER=DEBUG systemctl restart tfhers-management
```

（前提是 unit 用 `EnvironmentFile` / `Environment=` 传进容器；最稳的方式还是 `systemctl edit`。）

## 已知遗留（不影响磁盘，仅记录）

- `SteamPlaytimeSyncServiceImpl` 用 `System.out.println`（5 处，仅失败分支）和
  `Files.writeString(APPEND)` 写 `logs/steam-playtime-sync.log`，该文件没有滚动。
  实测每 30 分钟一次、每次几百字节，约 10KB/天、3.6MB/年，暂不处理；
  真要处理可加 logrotate 或改走 SLF4J。
- 应用自身的 `logs/` 目录若将来变大，可加 `/etc/logrotate.d/tfhers`。
