require "erb"

class VWF::Application::Admin < Sinatra::Base

  configure do
    set :app_file, VWF.settings.app_file
  end

  get "/" do
    erb :"admin.html"
  end

  # get "/state" do
  # 
  #   if transport = Rack::SocketIO::Application.session( env )[:transport]
  #     transport.state.to_json
  #   end
  # 
  # end

  get "/state" do  # TODO: switch to post; find substitute for query_string to parse

    if transport = Rack::SocketIO::Application.session( env )[:transport]
      state = Rack::Utils.parse_query request.query_string
      state[:rate] = state["rate"].to_f unless state["rate"].nil? || state["rate"].empty?
      transport.rate = state[:rate] unless state[:rate].nil? || state[:rate] == 0
      # TODO: other fields
      transport.state.to_json
    end

  end

  post "/time" do

    # TODO?

  end

  post "/rate" do

    if transport = Rack::SocketIO::Application.session( env )[:transport]
      body = request.body.read
      rate = body.to_f unless body.empty?
      transport.rate = rate unless rate.nil? || rate == 0
      transport.state.to_json
    end

  end

  post "/play" do

    if transport = Rack::SocketIO::Application.session( env )[:transport]
      transport.play
      transport.state.to_json
    end

  end

  post "/pause" do

    if transport = Rack::SocketIO::Application.session( env )[:transport]
      transport.pause
      transport.state.to_json
    end

  end

  post "/stop" do

    if transport = Rack::SocketIO::Application.session( env )[:transport]
      transport.stop
      transport.state.to_json
    end

  end

end